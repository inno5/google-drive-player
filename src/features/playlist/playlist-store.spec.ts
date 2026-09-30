import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthExpiredError } from "@/features/auth";
import type { DriveApi, DriveItem } from "@/features/drive";
import { useToast } from "@/shared/ui/useToast";
import { PLAYLIST_STORAGE_KEY, loadPlaylist } from "./playlist-storage";
import { usePlaylistStore } from "./playlist-store";

const FOLDER = "application/vnd.google-apps.folder";

function song(id: string, name = `${id}.mp3`): DriveItem {
  return {
    id,
    name,
    mimeType: "audio/mpeg",
    size: 10,
    modifiedTime: "",
    parents: ["dir"],
  };
}

const folder: DriveItem = {
  id: "dir",
  name: "Album",
  mimeType: FOLDER,
  size: null,
  modifiedTime: "",
  parents: ["root"],
};

function setup(children: DriveItem[] = []) {
  const listChildren = vi.fn<DriveApi["listChildren"]>(() =>
    Promise.resolve({ items: children, nextPageToken: null }),
  );
  const api = {
    downloadFile: vi.fn<DriveApi["downloadFile"]>(),
    listChildren,
    listFolder: vi.fn<DriveApi["listFolder"]>(),
    search: vi.fn<DriveApi["search"]>(),
  } satisfies DriveApi;
  const store = usePlaylistStore();
  store.setApi(api);
  return { store, listChildren };
}

function ids(store: ReturnType<typeof usePlaylistStore>): string[] {
  return store.items.map((i) => i.id);
}

describe("playlist store", () => {
  beforeEach(() => {
    localStorage.clear();
    useToast().clear();
    setActivePinia(createPinia());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("保存済みのプレイリストを読み込む", () => {
    localStorage.setItem(
      PLAYLIST_STORAGE_KEY,
      JSON.stringify({ version: 1, items: [song("a")] }),
    );
    setActivePinia(createPinia());
    expect(ids(usePlaylistStore())).toEqual(["a"]);
  });

  it("ファイルを末尾に追加して保存する", async () => {
    const { store } = setup();
    await store.add(song("a"));
    await store.add(song("b"));
    expect(ids(store)).toEqual(["a", "b"]);
    expect(loadPlaylist().map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("同じ ID を追加すると、位置はそのままで情報だけ更新する", async () => {
    const { store } = setup();
    await store.add(song("a", "old.mp3"));
    await store.add(song("b"));
    await store.add({ ...song("a", "new.mp3"), size: 99 });
    expect(ids(store)).toEqual(["a", "b"]);
    expect(store.items[0]).toMatchObject({ name: "new.mp3", size: 99 });
  });

  it("フォルダを追加すると中身の曲を集めて追加する", async () => {
    const { store, listChildren } = setup([song("b"), song("a")]);
    await store.add(folder);
    expect(listChildren).toHaveBeenCalled();
    expect(ids(store)).toEqual(["a", "b"]);
    expect(store.adding).toBeNull();
    expect(loadPlaylist()).toHaveLength(2);
  });

  it("中身がなければ何も追加せず、知らせる", async () => {
    const { store } = setup([]);
    await store.add(folder);
    expect(store.items).toEqual([]);
    expect(useToast().toasts.value.map((t) => t.text)).toEqual([
      "音声ファイルが見つかりませんでした",
    ]);
  });

  it("取得に失敗したら何も追加せず、エラーを知らせる", async () => {
    const { store, listChildren } = setup();
    listChildren.mockRejectedValueOnce(new Error("boom"));
    await store.add(folder);
    expect(store.items).toEqual([]);
    expect(store.adding).toBeNull();
    expect(useToast().toasts.value[0]?.type).toBe("error");
  });

  it("認証切れのときは、エラーを出さずに何も追加しない", async () => {
    const { store, listChildren } = setup();
    listChildren.mockRejectedValueOnce(new AuthExpiredError());
    await store.add(folder);
    expect(store.items).toEqual([]);
    expect(useToast().toasts.value).toHaveLength(0);
  });

  it("上限で打ち切ったときは知らせる", async () => {
    const many = Array.from({ length: 501 }, (_, i) =>
      song(`s${String(i).padStart(3, "0")}`),
    );
    const { store } = setup(many);
    await store.add(folder);
    expect(store.items).toHaveLength(500);
    expect(useToast().toasts.value[0]?.text).toContain("上限");
  });

  it("追加中は集めた曲数を持ち、キャンセルすると何も追加しない", async () => {
    const { store, listChildren } = setup();
    let release: () => void = () => undefined;
    listChildren.mockImplementationOnce(
      (_ids, options) =>
        new Promise((resolve, reject) => {
          release = () => {
            resolve({ items: [song("a")], nextPageToken: null });
          };
          options?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const pending = store.add(folder);
    expect(store.adding).toEqual({ count: 0 });

    store.cancelAdding();
    expect(store.adding).toBeNull();
    release();
    await pending;
    expect(store.items).toEqual([]);
    expect(useToast().toasts.value).toHaveLength(0);
  });

  it("フォルダ追加中に別のフォルダは追加できない（ファイルは追加できる）", async () => {
    const { store, listChildren } = setup();
    let release: () => void = () => undefined;
    listChildren.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => {
            resolve({ items: [song("a")], nextPageToken: null });
          };
        }),
    );
    const first = store.add(folder);
    await store.add({ ...folder, id: "other" });
    expect(listChildren).toHaveBeenCalledTimes(1);
    await store.add(song("solo"));
    release();
    await first;
    expect(ids(store)).toEqual(["solo", "a"]);
  });

  it("削除・並べ替え・全削除を保存する", async () => {
    const { store } = setup();
    await store.add(song("a"));
    await store.add(song("b"));
    await store.add(song("c"));

    store.remove("b");
    expect(loadPlaylist().map((i) => i.id)).toEqual(["a", "c"]);

    store.reorder([song("c"), song("a")]);
    expect(loadPlaylist().map((i) => i.id)).toEqual(["c", "a"]);

    store.clear();
    expect(store.items).toEqual([]);
    expect(loadPlaylist()).toEqual([]);
  });

  it("保存に失敗しても画面上の状態は残し、知らせる", async () => {
    const { store } = setup();
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
      key: () => null,
      length: 0,
    });
    await store.add(song("a"));
    expect(ids(store)).toEqual(["a"]);
    expect(useToast().toasts.value[0]).toMatchObject({ type: "error" });
  });
});
