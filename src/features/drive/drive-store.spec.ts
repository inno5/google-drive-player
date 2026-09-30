import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthExpiredError } from "@/features/auth";
import type { DriveApi, ListPage } from "./drive-api";
import { useDriveStore } from "./drive-store";
import type { DriveItem } from "./drive-types";

function item(id: string): DriveItem {
  return {
    id,
    name: `${id}.mp3`,
    mimeType: "audio/mpeg",
    size: 1,
    modifiedTime: "",
    parents: [],
  };
}

function page(ids: string[], next: string | null = null): ListPage {
  return { items: ids.map(item), nextPageToken: next };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const api = {
    listFolder: vi.fn<DriveApi["listFolder"]>(() =>
      Promise.resolve(page(["a", "b"])),
    ),
    search: vi.fn<DriveApi["search"]>(() => Promise.resolve(page(["s"]))),
    listChildren: vi.fn<DriveApi["listChildren"]>(() =>
      Promise.resolve(page([])),
    ),
  } satisfies DriveApi;
  const store = useDriveStore();
  store.setApi(api);
  return { api, store };
}

describe("drive store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("フォルダを開くと 1 ページ目を読む", async () => {
    const { api, store } = setup();
    api.listFolder.mockResolvedValueOnce(page(["a", "b"], "p2"));
    await store.openFolder("root");
    expect(api.listFolder).toHaveBeenCalledWith(
      "root",
      expect.objectContaining({ pageToken: null }),
    );
    expect(store.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(store.nextPageToken).toBe("p2");
    expect(store.status).toBe("idle");
    expect(store.hasLoaded).toBe(true);
  });

  it("loadMore は次のページを末尾に足す", async () => {
    const { api, store } = setup();
    api.listFolder
      .mockResolvedValueOnce(page(["a"], "p2"))
      .mockResolvedValueOnce(page(["b"]));
    await store.openFolder("root");
    await store.loadMore();
    expect(api.listFolder).toHaveBeenLastCalledWith(
      "root",
      expect.objectContaining({ pageToken: "p2" }),
    );
    expect(store.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(store.nextPageToken).toBeNull();
  });

  it("次のページがなければ loadMore は何もしない", async () => {
    const { api, store } = setup();
    await store.openFolder("root");
    await store.loadMore();
    expect(api.listFolder).toHaveBeenCalledTimes(1);
  });

  it("読み込み中の loadMore は何もしない", async () => {
    const { api, store } = setup();
    api.listFolder.mockResolvedValueOnce(page(["a"], "p2"));
    await store.openFolder("root");
    const slow = deferred<ListPage>();
    api.listFolder.mockReturnValueOnce(slow.promise);
    const first = store.loadMore();
    await store.loadMore();
    expect(api.listFolder).toHaveBeenCalledTimes(2);
    slow.resolve(page(["b"]));
    await first;
    expect(store.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("検索は search API を使い、開き直すと一覧を空にして読み直す", async () => {
    const { api, store } = setup();
    await store.search("foo");
    expect(api.search).toHaveBeenCalledWith(
      "foo",
      expect.objectContaining({ pageToken: null }),
    );
    expect(store.mode).toBe("search");
    expect(store.query).toBe("foo");
    expect(store.items.map((i) => i.id)).toEqual(["s"]);

    await store.openFolder("x");
    expect(store.mode).toBe("folder");
    expect(store.query).toBe("");
    expect(store.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("古いリクエストは中止し、その応答は捨てる", async () => {
    const { api, store } = setup();
    const slow = deferred<ListPage>();
    api.listFolder.mockReturnValueOnce(slow.promise);
    const first = store.openFolder("old");
    const firstSignal = api.listFolder.mock.calls[0]?.[1]?.signal;

    api.listFolder.mockResolvedValueOnce(page(["new"]));
    await store.openFolder("new");
    expect(firstSignal?.aborted).toBe(true);

    slow.resolve(page(["stale"]));
    await first;
    expect(store.items.map((i) => i.id)).toEqual(["new"]);
    expect(store.folderId).toBe("new");
    expect(store.status).toBe("idle");
  });

  it("中止によるエラーは無視する", async () => {
    const { api, store } = setup();
    const slow = deferred<ListPage>();
    api.listFolder.mockReturnValueOnce(slow.promise);
    const first = store.openFolder("old");
    await store.openFolder("new");
    slow.reject(new DOMException("aborted", "AbortError"));
    await first;
    expect(store.status).toBe("idle");
    expect(store.error).toBeNull();
  });

  it("1 ページ目のエラーは retry で 1 ページ目から読み直す", async () => {
    const { api, store } = setup();
    api.listFolder.mockRejectedValueOnce(new Error("boom"));
    await store.openFolder("root");
    expect(store.status).toBe("error");
    expect(store.error).toBe("boom");
    expect(store.hasLoaded).toBe(false);

    await store.retry();
    expect(store.status).toBe("idle");
    expect(store.error).toBeNull();
    expect(store.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("2 ページ目のエラーは retry で同じ続きから読み、エラー中は loadMore しない", async () => {
    const { api, store } = setup();
    api.listFolder
      .mockResolvedValueOnce(page(["a"], "p2"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(page(["b"]));
    await store.openFolder("root");
    await store.loadMore();
    expect(store.status).toBe("error");
    expect(store.items.map((i) => i.id)).toEqual(["a"]);

    await store.loadMore();
    expect(api.listFolder).toHaveBeenCalledTimes(2);

    await store.retry();
    expect(api.listFolder).toHaveBeenLastCalledWith(
      "root",
      expect.objectContaining({ pageToken: "p2" }),
    );
    expect(store.items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("認証切れはエラー表示にしない（画面遷移は認証状態が担う）", async () => {
    const { api, store } = setup();
    api.listFolder.mockRejectedValueOnce(new AuthExpiredError());
    await store.openFolder("root");
    expect(store.status).toBe("idle");
    expect(store.error).toBeNull();
  });

  it("reorder は並べ替えた結果を反映する", async () => {
    const { store } = setup();
    await store.openFolder("root");
    store.reorder([item("b"), item("a")]);
    expect(store.items.map((i) => i.id)).toEqual(["b", "a"]);
  });
});
