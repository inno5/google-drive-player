import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSettings } from "@/shared/storage/settings";
import { useToast } from "@/shared/ui/useToast";
import { TAGS_STORAGE_KEY, loadTags, saveTags } from "./tag-storage";
import {
  MAX_CONCURRENT_READS,
  PERSIST_DELAY_MS,
  useTagStore,
} from "./tag-store";
import type { RawTags, ReadOutcome, TagTarget } from "./tag-types";

const tagsA: RawTags = {
  artist: "Artist",
  title: "Song",
  album: "Album",
  track: "3",
};

function target(id: string, modifiedTime = "m1"): TagTarget {
  return { id, name: `${id}.mp3`, modifiedTime };
}

interface Deferred {
  id: string;
  resolve(outcome: ReadOutcome): void;
}

/** 読み取りを呼ばれた順に溜めて、テストから結果を返す */
function setup() {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useTagStore();
  const pending: Deferred[] = [];
  const reader = vi.fn(
    (id: string) =>
      new Promise<ReadOutcome>((resolve) => {
        pending.push({ id, resolve });
      }),
  );
  store.setReader(reader);
  return { store, reader, pending };
}

/** 読み取りが 1 件ずつ即座に完了するリーダー */
function setupImmediate(outcome: ReadOutcome) {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useTagStore();
  const reader = vi.fn((_id: string) => Promise.resolve(outcome));
  store.setReader(reader);
  return { store, reader };
}

describe("tag-store: 読み取り", () => {
  beforeEach(() => {
    // flushPromises が setImmediate を使うので、setTimeout だけを偽物にする
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    useToast().clear();
  });

  it("未読の曲のタグを読んで保存する", async () => {
    const { store } = setupImmediate({ status: "ok", tags: tagsA });
    store.sync([target("s1")]);
    await flushPromises();
    expect(store.tags.s1).toEqual({ modifiedTime: "m1", ...tagsA });
  });

  it("保存は 500ms まとめて行う", async () => {
    const { store } = setupImmediate({ status: "ok", tags: tagsA });
    store.sync([target("s1"), target("s2")]);
    await flushPromises();
    expect(localStorage.getItem(TAGS_STORAGE_KEY)).toBeNull();
    await vi.advanceTimersByTimeAsync(PERSIST_DELAY_MS);
    expect(Object.keys(loadTags()).sort()).toEqual(["s1", "s2"]);
  });

  it("保存済みで更新日時が同じ曲は読まない。違えば読み直す", async () => {
    localStorage.clear();
    saveTags({ s1: { modifiedTime: "m1", ...tagsA } });
    setActivePinia(createPinia());
    const store = useTagStore();
    const reader = vi.fn((_id: string) =>
      Promise.resolve<ReadOutcome>({ status: "ok", tags: tagsA }),
    );
    store.setReader(reader);

    store.sync([target("s1", "m1")]);
    await flushPromises();
    expect(reader).not.toHaveBeenCalled();

    store.sync([target("s1", "m2")]);
    await flushPromises();
    expect(reader).toHaveBeenCalledWith("s1");
    expect(store.tags.s1?.modifiedTime).toBe("m2");
  });

  it("タグがない曲は、タグなしとして保存し、読み直さない", async () => {
    const { store, reader } = setupImmediate({ status: "none" });
    store.sync([target("s1")]);
    await flushPromises();
    expect(store.tags.s1).toEqual({
      modifiedTime: "m1",
      artist: "",
      title: "",
      album: "",
      track: "",
    });
    store.sync([target("s1")]);
    await flushPromises();
    expect(reader).toHaveBeenCalledTimes(1);
  });

  it("失敗した曲は保存せず、同じ起動中は再試行しない", async () => {
    const { store, reader } = setupImmediate({ status: "failed" });
    store.sync([target("s1")]);
    await flushPromises();
    expect(store.tags.s1).toBeUndefined();

    store.sync([target("s1")]);
    await flushPromises();
    expect(reader).toHaveBeenCalledTimes(1);

    // 更新日時が変わった（別のファイルになった）ら、読む
    store.sync([target("s1", "m2")]);
    await flushPromises();
    expect(reader).toHaveBeenCalledTimes(2);
  });

  it("リーダーが例外を投げても failed として扱う", async () => {
    localStorage.clear();
    setActivePinia(createPinia());
    const store = useTagStore();
    const reader = vi.fn((_id: string) =>
      Promise.reject<ReadOutcome>(new Error("auth")),
    );
    store.setReader(reader);
    store.sync([target("s1")]);
    await flushPromises();
    store.sync([target("s1")]);
    await flushPromises();
    expect(reader).toHaveBeenCalledTimes(1);
    expect(store.tags.s1).toBeUndefined();
  });

  it("読み取り中や待ちの曲は、重複して積まない", () => {
    const { store, reader } = setup();
    const items = Array.from({ length: 15 }, (_, i) => target(`s${i}`));
    store.sync(items);
    store.sync(items);
    expect(reader).toHaveBeenCalledTimes(MAX_CONCURRENT_READS);
  });

  it("同時に読むのは最大 10 件。1 件終わるごとに次を読む", async () => {
    const { store, reader, pending } = setup();
    store.sync(Array.from({ length: 25 }, (_, i) => target(`s${i}`)));
    expect(reader).toHaveBeenCalledTimes(10);

    pending[0]?.resolve({ status: "ok", tags: tagsA });
    await flushPromises();
    expect(reader).toHaveBeenCalledTimes(11);
    expect(reader).toHaveBeenLastCalledWith("s10");
  });

  it("プレイリストにない曲のタグは、sync で捨てて保存から消す", async () => {
    localStorage.clear();
    saveTags({
      s1: { modifiedTime: "m1", ...tagsA },
      gone: { modifiedTime: "m1", ...tagsA },
    });
    setActivePinia(createPinia());
    const store = useTagStore();
    store.setReader(() =>
      Promise.resolve<ReadOutcome>({ status: "ok", tags: tagsA }),
    );

    store.sync([target("s1")]);
    expect(store.tags.gone).toBeUndefined();
    await vi.advanceTimersByTimeAsync(PERSIST_DELAY_MS);
    expect(Object.keys(loadTags())).toEqual(["s1"]);
  });

  it("読んでいる間にプレイリストから消された曲の結果は捨てる", async () => {
    const { store, pending } = setup();
    store.sync([target("s1"), target("s2")]);
    store.sync([target("s2")]);
    pending[0]?.resolve({ status: "ok", tags: tagsA });
    await flushPromises();
    expect(store.tags.s1).toBeUndefined();
  });

  it("消された曲の待ちは、読まずに捨てる", async () => {
    const { store, reader, pending } = setup();
    const items = Array.from({ length: 12 }, (_, i) => target(`s${i}`));
    store.sync(items);
    store.sync(items.slice(0, 10));
    for (const p of [...pending]) {
      p.resolve({ status: "ok", tags: tagsA });
    }
    await flushPromises();
    expect(reader).toHaveBeenCalledTimes(10);
  });

  it("clearQueue で待ちを空にする。保存済みのタグは残す", async () => {
    const { store, reader, pending } = setup();
    store.sync(Array.from({ length: 12 }, (_, i) => target(`s${i}`)));
    pending[0]?.resolve({ status: "ok", tags: tagsA });
    await flushPromises();
    expect(reader).toHaveBeenCalledTimes(11);

    store.clearQueue();
    for (const p of pending.slice(1)) {
      p.resolve({ status: "failed" });
    }
    await flushPromises();
    expect(reader).toHaveBeenCalledTimes(11);
    expect(store.tags.s0).toBeDefined();

    // サインアウトの間の失敗は、再サインイン後の読み取りを妨げない
    store.sync([target("s1")]);
    expect(reader).toHaveBeenCalledTimes(12);
  });
});

describe("tag-store: 表示", () => {
  afterEach(() => {
    useToast().clear();
  });

  it("表示モードに応じた曲名を返す。タグがない曲はファイル名", () => {
    const { store } = setup();
    store.tags.s1 = { modifiedTime: "m1", ...tagsA };
    expect(store.displayName({ id: "s1", name: "s1.mp3" })).toBe(
      "Song - Artist",
    );
    store.cycleDisplayMode();
    expect(store.displayName({ id: "s1", name: "s1.mp3" })).toBe(
      "Artist / Album [3] - Song",
    );
    store.cycleDisplayMode();
    expect(store.displayName({ id: "s1", name: "s1.mp3" })).toBe("s1.mp3");
    expect(store.displayName({ id: "none", name: "none.mp3" })).toBe(
      "none.mp3",
    );
  });

  it("切り替えると保存し、トーストで知らせる", () => {
    const { store } = setup();
    store.cycleDisplayMode();
    expect(store.displayMode).toBe("full");
    expect(loadSettings().displayMode).toBe("full");
    expect(useToast().toasts.value.map((t) => t.text)).toEqual([
      "アーティスト / アルバム [トラック] - タイトル",
    ]);
  });

  it("保存された表示モードを引き継ぐ。不正な値は既定に戻す", () => {
    localStorage.clear();
    localStorage.setItem(
      "gdp:settings",
      JSON.stringify({ version: 1, displayMode: "fileName" }),
    );
    setActivePinia(createPinia());
    expect(useTagStore().displayMode).toBe("fileName");

    localStorage.setItem(
      "gdp:settings",
      JSON.stringify({ version: 1, displayMode: "bogus" }),
    );
    setActivePinia(createPinia());
    expect(useTagStore().displayMode).toBe("titleArtist");
  });

  it("ロック画面の曲情報: タグがそろっていれば分けて出し、ファイル名モードでは出さない", () => {
    const { store } = setup();
    store.tags.s1 = { modifiedTime: "m1", ...tagsA };
    store.tags.s2 = { modifiedTime: "m1", ...tagsA, album: "" };
    store.tags.s3 = { modifiedTime: "m1", ...tagsA, title: "" };

    expect(store.mediaMetadata({ id: "s1", name: "s1.mp3" })).toEqual({
      title: "Song",
      artist: "Artist",
      album: "Album",
    });
    expect(store.mediaMetadata({ id: "s2", name: "s2.mp3" })).toEqual({
      title: "Song",
      artist: "Artist",
    });
    expect(store.mediaMetadata({ id: "s3", name: "s3.mp3" })).toEqual({
      title: "s3.mp3",
    });
    expect(store.mediaMetadata({ id: "x", name: "x.mp3" })).toEqual({
      title: "x.mp3",
    });

    store.cycleDisplayMode();
    store.cycleDisplayMode();
    expect(store.mediaMetadata({ id: "s1", name: "s1.mp3" })).toEqual({
      title: "s1.mp3",
    });
  });
});
