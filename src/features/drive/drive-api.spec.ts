import { describe, expect, it, vi } from "vitest";
import { AuthExpiredError } from "@/features/auth";
import { createDriveApi, DriveApiError, type DriveAuth } from "./drive-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup() {
  const auth = {
    getValidToken: vi.fn(() => Promise.resolve("t1")),
    refreshToken: vi.fn(() => Promise.resolve("t2")),
    expire: vi.fn(),
  } satisfies DriveAuth;
  const fetchFn = vi.fn<typeof fetch>();
  return { auth, fetchFn, api: createDriveApi(auth, fetchFn) };
}

function requestAt(fetchFn: ReturnType<typeof setup>["fetchFn"], n: number) {
  const call = fetchFn.mock.calls[n];
  if (!call) {
    throw new Error(`fetch call ${n} not found`);
  }
  const [input, init] = call;
  return {
    url: new URL(String(input)),
    headers: init?.headers as Record<string, string>,
    signal: init?.signal,
  };
}

describe("drive-api", () => {
  it("フォルダの一覧を取得し、項目を整形する", async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(
      jsonResponse({
        files: [
          {
            id: "1",
            name: "a.mp3",
            mimeType: "audio/mpeg",
            size: "1234",
            modifiedTime: "2026-01-01T00:00:00.000Z",
            parents: ["root"],
          },
          {
            id: "2",
            name: "dir",
            mimeType: "application/vnd.google-apps.folder",
          },
        ],
        nextPageToken: "next",
      }),
    );

    const page = await api.listFolder("root");

    expect(page.nextPageToken).toBe("next");
    expect(page.items).toEqual([
      {
        id: "1",
        name: "a.mp3",
        mimeType: "audio/mpeg",
        size: 1234,
        modifiedTime: "2026-01-01T00:00:00.000Z",
        parents: ["root"],
      },
      {
        id: "2",
        name: "dir",
        mimeType: "application/vnd.google-apps.folder",
        size: null,
        modifiedTime: "",
        parents: [],
      },
    ]);

    const { url, headers } = requestAt(fetchFn, 0);
    expect(url.origin + url.pathname).toBe(
      "https://www.googleapis.com/drive/v3/files",
    );
    expect(url.searchParams.get("q")).toContain("'root' in parents");
    expect(url.searchParams.get("pageSize")).toBe("100");
    expect(url.searchParams.get("orderBy")).toBe("folder asc, name asc");
    expect(url.searchParams.get("pageToken")).toBeNull();
    expect(headers.Authorization).toBe("Bearer t1");
  });

  it("最後のページでは nextPageToken が null、files がなければ空", async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(jsonResponse({}));
    await expect(api.listFolder("root")).resolves.toEqual({
      items: [],
      nextPageToken: null,
    });
  });

  it("pageToken と signal を渡す", async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(jsonResponse({ files: [] }));
    const controller = new AbortController();
    await api.listFolder("root", {
      pageToken: "p2",
      signal: controller.signal,
    });
    const { url, signal } = requestAt(fetchFn, 0);
    expect(url.searchParams.get("pageToken")).toBe("p2");
    expect(signal).toBe(controller.signal);
  });

  it("検索は名前の部分一致で、特殊文字をエスケープする", async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(jsonResponse({ files: [] }));
    await api.search("it's");
    const { url } = requestAt(fetchFn, 0);
    expect(url.searchParams.get("q")).toContain("name contains 'it\\'s'");
  });

  it("listChildren は 1000 件ずつ、並び順の指定なし", async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(jsonResponse({ files: [] }));
    await api.listChildren(["a", "b"]);
    const { url } = requestAt(fetchFn, 0);
    expect(url.searchParams.get("q")).toContain(
      "('a' in parents or 'b' in parents)",
    );
    expect(url.searchParams.get("pageSize")).toBe("1000");
    expect(url.searchParams.get("orderBy")).toBeNull();
  });

  it("401 ならトークンを取り直して 1 回だけ再試行する", async () => {
    const { api, auth, fetchFn } = setup();
    fetchFn
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ files: [] }));

    await expect(api.listFolder("root")).resolves.toEqual({
      items: [],
      nextPageToken: null,
    });

    expect(auth.getValidToken).toHaveBeenCalledTimes(1);
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(requestAt(fetchFn, 1).headers.Authorization).toBe("Bearer t2");
    expect(auth.expire).not.toHaveBeenCalled();
  });

  it("再試行も 401 なら AuthExpiredError にして expire する", async () => {
    const { api, auth, fetchFn } = setup();
    fetchFn
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401));
    await expect(api.listFolder("root")).rejects.toBeInstanceOf(
      AuthExpiredError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(auth.expire).toHaveBeenCalledTimes(1);
  });

  it("トークンを取り直せなければ AuthExpiredError（再試行しない）", async () => {
    const { api, auth, fetchFn } = setup();
    auth.refreshToken.mockRejectedValueOnce(new AuthExpiredError());
    fetchFn.mockResolvedValueOnce(jsonResponse({}, 401));
    await expect(api.listFolder("root")).rejects.toBeInstanceOf(
      AuthExpiredError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("401 以外のエラーは DriveApiError（status 付き）", async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(jsonResponse({}, 503));
    const error = await api.listFolder("root").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DriveApiError);
    expect((error as DriveApiError).status).toBe(503);
  });

  it("ネットワークエラーや中止はそのまま伝わる", async () => {
    const { api, fetchFn } = setup();
    const abort = new DOMException("aborted", "AbortError");
    fetchFn.mockRejectedValueOnce(abort);
    await expect(api.listFolder("root")).rejects.toBe(abort);
  });
});
