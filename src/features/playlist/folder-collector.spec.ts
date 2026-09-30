import { describe, expect, it, vi } from "vitest";
import type { DriveApi, DriveItem, ListOptions } from "@/features/drive";
import { collectFolder } from "./folder-collector";

const FOLDER = "application/vnd.google-apps.folder";

function file(name: string, parent: string): DriveItem {
  return {
    id: `${parent}/${name}`,
    name,
    mimeType: "audio/mpeg",
    size: 1,
    modifiedTime: "",
    parents: [parent],
  };
}

function dir(name: string, parent: string): DriveItem {
  return {
    id: `${parent}/${name}`,
    name,
    mimeType: FOLDER,
    size: null,
    modifiedTime: "",
    parents: [parent],
  };
}

/** tree: 親 ID → 直下の項目。pageSize 件ずつのページで返す */
function fakeApi(tree: Record<string, DriveItem[]>, pageSize = 1000) {
  const listChildren = vi.fn(
    (parentIds: readonly string[], options: ListOptions = {}) => {
      const all = parentIds.flatMap((id) => tree[id] ?? []);
      const offset = Number(options.pageToken ?? 0);
      const end = offset + pageSize;
      return Promise.resolve({
        items: all.slice(offset, end),
        nextPageToken: end < all.length ? String(end) : null,
      });
    },
  );
  const api = {
    listChildren,
    listFolder: vi.fn(),
    search: vi.fn(),
  } satisfies DriveApi;
  return { api, listChildren };
}

function names(items: DriveItem[]): string[] {
  return items.map((item) => item.id);
}

describe("collectFolder", () => {
  it("直下のファイルを名前の自然順（2 → 10）で並べる", async () => {
    const { api } = fakeApi({
      root: [
        file("10 outro", "root"),
        file("2 song", "root"),
        file("01 in", "root"),
      ],
    });
    const result = await collectFolder(api, { id: "root" });
    expect(result.items.map((i) => i.name)).toEqual([
      "01 in",
      "2 song",
      "10 outro",
    ]);
    expect(result.truncated).toBe(false);
  });

  it("直下のファイルのあとに、サブフォルダを順に（深さ優先で）並べる", async () => {
    const { api } = fakeApi({
      root: [
        dir("Disc 2", "root"),
        file("b", "root"),
        dir("Disc 1", "root"),
        file("a", "root"),
      ],
      "root/Disc 1": [file("x", "root/Disc 1"), dir("Bonus", "root/Disc 1")],
      "root/Disc 1/Bonus": [file("y", "root/Disc 1/Bonus")],
      "root/Disc 2": [file("z", "root/Disc 2")],
    });
    const result = await collectFolder(api, { id: "root" });
    expect(names(result.items)).toEqual([
      "root/a",
      "root/b",
      "root/Disc 1/x",
      "root/Disc 1/Bonus/y",
      "root/Disc 2/z",
    ]);
  });

  it("nextPageToken を最後まで追う", async () => {
    const files = Array.from({ length: 5 }, (_, i) => file(`f${i}`, "root"));
    const { api, listChildren } = fakeApi({ root: files }, 2);
    const result = await collectFolder(api, { id: "root" });
    expect(result.items).toHaveLength(5);
    expect(listChildren).toHaveBeenCalledTimes(3);
  });

  it("兄弟のフォルダは 50 個ずつまとめて取得する", async () => {
    const tree: Record<string, DriveItem[]> = {
      root: Array.from({ length: 120 }, (_, i) =>
        dir(`d${String(i).padStart(3, "0")}`, "root"),
      ),
    };
    for (const d of tree.root ?? []) {
      tree[d.id] = [file("t", d.id)];
    }
    const { api, listChildren } = fakeApi(tree);
    const result = await collectFolder(api, { id: "root" });
    expect(result.items).toHaveLength(120);
    const sizes = listChildren.mock.calls.map(([ids]) => ids.length);
    expect(sizes).toEqual([1, 50, 50, 20]);
  });

  it("曲数の上限で打ち切る（ちょうど上限なら打ち切りではない）", async () => {
    const files = Array.from({ length: 5 }, (_, i) => file(`f${i}`, "root"));
    const { api } = fakeApi({ root: files });
    const over = await collectFolder(api, { id: "root" }, { maxTracks: 3 });
    expect(over.items).toHaveLength(3);
    expect(over.truncated).toBe(true);
    const exact = await collectFolder(api, { id: "root" }, { maxTracks: 5 });
    expect(exact.items).toHaveLength(5);
    expect(exact.truncated).toBe(false);
  });

  it("上限に達したら、以降のフォルダは取得しない", async () => {
    const { api, listChildren } = fakeApi({
      root: [file("a", "root"), dir("d", "root")],
      "root/d": [file("b", "root/d")],
    });
    const result = await collectFolder(api, { id: "root" }, { maxTracks: 1 });
    expect(names(result.items)).toEqual(["root/a"]);
    expect(result.truncated).toBe(true);
    expect(listChildren).toHaveBeenCalledTimes(2);
  });

  it("深さの上限で打ち切る", async () => {
    const { api } = fakeApi({
      root: [file("a", "root"), dir("d1", "root")],
      "root/d1": [file("b", "root/d1"), dir("d2", "root/d1")],
      "root/d1/d2": [file("c", "root/d1/d2")],
    });
    const result = await collectFolder(api, { id: "root" }, { maxDepth: 2 });
    expect(names(result.items)).toEqual(["root/a", "root/d1/b"]);
    expect(result.truncated).toBe(true);

    const enough = await collectFolder(api, { id: "root" }, { maxDepth: 3 });
    expect(enough.items).toHaveLength(3);
    expect(enough.truncated).toBe(false);
  });

  it("同じ ID は 1 度だけ入れる", async () => {
    const dup = file("a", "root");
    const { api } = fakeApi({
      root: [dup, dir("d", "root")],
      "root/d": [{ ...dup, parents: ["root/d"] }],
    });
    const result = await collectFolder(api, { id: "root" });
    expect(result.items).toHaveLength(1);
  });

  it("集めた曲数を通知する", async () => {
    const { api } = fakeApi({ root: [file("a", "root"), file("b", "root")] });
    const onProgress = vi.fn();
    await collectFolder(api, { id: "root" }, { onProgress });
    expect(onProgress.mock.calls).toEqual([[1], [2]]);
  });

  it("途中でエラーになったら例外を投げる", async () => {
    const { api, listChildren } = fakeApi({
      root: [dir("d", "root")],
    });
    listChildren
      .mockImplementationOnce(() =>
        Promise.resolve({ items: [dir("d", "root")], nextPageToken: null }),
      )
      .mockImplementationOnce(() => Promise.reject(new Error("boom")));
    await expect(collectFolder(api, { id: "root" })).rejects.toThrow("boom");
  });

  it("中止されたら AbortError", async () => {
    const { api } = fakeApi({ root: [file("a", "root")] });
    const controller = new AbortController();
    controller.abort();
    await expect(
      collectFolder(api, { id: "root" }, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
