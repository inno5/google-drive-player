import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthExpiredError } from "@/features/auth";
import type { DriveItem } from "@/features/drive";
import { loadSettings } from "@/shared/storage/settings";
import { useToast } from "@/shared/ui/useToast";
import type { AudioEvents } from "./audio-element";
import type { LoadedMedia } from "./media-loader";
import { usePlayerStore, type PlaySource } from "./player-store";

function song(id: string): DriveItem {
  return {
    id,
    name: `${id}.mp3`,
    mimeType: "audio/mpeg",
    size: 1,
    modifiedTime: "",
    parents: [],
  };
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

function setup(
  lists: Record<PlaySource, DriveItem[]> = {
    drive: [song("a"), song("b"), song("c")],
    playlist: [song("p1"), song("p2")],
  },
  random = () => 0,
) {
  let handlers: Partial<AudioEvents> = {};
  const audio = {
    setSource: vi.fn<(url: string) => void>(),
    clearSource: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    seek: vi.fn<(seconds: number) => void>(),
    subscribe: vi.fn((events: Partial<AudioEvents>) => {
      handlers = events;
    }),
  };
  const revokes = new Map<string, ReturnType<typeof vi.fn>>();
  const loadMedia = vi.fn(
    (
      item: DriveItem,
      _options: { signal?: AbortSignal; onProgress?: (r: number) => void },
    ): Promise<LoadedMedia> => {
      const revoke = vi.fn();
      revokes.set(item.id, revoke);
      return Promise.resolve({ url: `blob:${item.id}`, revoke });
    },
  );
  const store = usePlayerStore();
  store.configure({
    audio,
    loadMedia,
    getItems: (source) => lists[source],
    random,
  });
  return {
    store,
    audio,
    loadMedia,
    revokes,
    lists,
    emit: () => handlers,
  };
}

function playedIds(loadMedia: ReturnType<typeof setup>["loadMedia"]): string[] {
  return loadMedia.mock.calls.map(([item]) => item.id);
}

describe("player store", () => {
  beforeEach(() => {
    localStorage.clear();
    useToast().clear();
    setActivePinia(createPinia());
  });

  describe("play", () => {
    it("曲を取得して再生する", async () => {
      const { store, audio, loadMedia } = setup();
      const pending = store.play(song("a"), "drive");
      expect(store.status).toBe("loading");
      expect(store.current?.id).toBe("a");
      expect(store.source).toBe("drive");
      await pending;
      expect(loadMedia).toHaveBeenCalledTimes(1);
      expect(audio.setSource).toHaveBeenCalledWith("blob:a");
      expect(audio.play).toHaveBeenCalled();
      expect(store.status).toBe("playing");
    });

    it("取得の進み具合を反映する", async () => {
      const { store, loadMedia } = setup();
      const slow = deferred<LoadedMedia>();
      loadMedia.mockReturnValueOnce(slow.promise);
      const pending = store.play(song("a"), "drive");
      loadMedia.mock.calls[0]?.[1].onProgress?.(0.4);
      expect(store.loadedRatio).toBe(0.4);
      slow.resolve({ url: "blob:a", revoke: vi.fn() });
      await pending;
    });

    it("次の曲を渡したあとに、前の曲の Blob URL を解放する", async () => {
      const { store, audio, revokes } = setup();
      await store.play(song("a"), "drive");
      await store.play(song("b"), "drive");
      const revokeA = revokes.get("a");
      expect(revokeA).toHaveBeenCalledTimes(1);
      expect(revokes.get("b")).not.toHaveBeenCalled();
      const setB = audio.setSource.mock.invocationCallOrder[1] ?? 0;
      const revokeOrder = revokeA?.mock.invocationCallOrder[0] ?? 0;
      expect(revokeOrder).toBeGreaterThan(setB);
    });

    it("読み込み中に別の曲を選ぶと、前のリクエストを中止し、その結果は捨てる", async () => {
      const { store, audio, loadMedia } = setup();
      const slow = deferred<LoadedMedia>();
      loadMedia.mockReturnValueOnce(slow.promise);
      const first = store.play(song("a"), "drive");
      const firstSignal = loadMedia.mock.calls[0]?.[1].signal;

      await store.play(song("b"), "drive");
      expect(firstSignal?.aborted).toBe(true);

      const revokeA = vi.fn();
      slow.resolve({ url: "blob:a", revoke: revokeA });
      await first;
      expect(revokeA).toHaveBeenCalledTimes(1);
      expect(audio.setSource).toHaveBeenCalledTimes(1);
      expect(audio.setSource).toHaveBeenCalledWith("blob:b");
      expect(store.current?.id).toBe("b");
      expect(store.status).toBe("playing");
    });

    it("ブラウザに再生を拒否されたら、停止中にして再開できるようにする", async () => {
      const { store, audio } = setup();
      audio.play.mockRejectedValueOnce(new Error("NotAllowedError"));
      await store.play(song("a"), "drive");
      expect(store.status).toBe("paused");
      expect(useToast().toasts.value).toHaveLength(0);

      const action = store.toggle();
      expect(action).toBe("play");
      await flushPromises();
      expect(store.status).toBe("playing");
    });

    it("認証切れのときはエラー表示にしない", async () => {
      const { store, loadMedia } = setup();
      loadMedia.mockRejectedValueOnce(new AuthExpiredError());
      await store.play(song("a"), "drive");
      expect(store.status).toBe("idle");
      expect(useToast().toasts.value).toHaveLength(0);
    });
  });

  describe("next / prev（通常）", () => {
    it("再生元の一覧の次・前の曲を再生し、端では折り返す", async () => {
      const { store, loadMedia } = setup();
      await store.play(song("a"), "drive");
      store.next();
      await flushPromises();
      store.prev();
      await flushPromises();
      store.prev();
      await flushPromises();
      store.next();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "b", "a", "c", "a"]);
    });

    it("今の曲が一覧になければ 1 曲目から（別のフォルダを開いた場合）", async () => {
      const { store, loadMedia, lists } = setup();
      await store.play(song("a"), "drive");
      lists.drive = [song("x"), song("y")];
      store.next();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "x"]);
    });

    it("再生元の一覧が空なら何もしない", async () => {
      const { store, loadMedia, lists } = setup();
      await store.play(song("a"), "drive");
      lists.drive = [];
      store.next();
      await flushPromises();
      expect(loadMedia).toHaveBeenCalledTimes(1);
      expect(store.status).toBe("playing");
    });

    it("1 曲だけの一覧では、同じ曲を頭から再生し直す", async () => {
      const { store, audio, loadMedia, lists } = setup();
      lists.drive = [song("a")];
      await store.play(song("a"), "drive");
      store.next();
      await flushPromises();
      expect(loadMedia).toHaveBeenCalledTimes(1);
      expect(audio.seek).toHaveBeenCalledWith(0);
      expect(audio.play).toHaveBeenCalledTimes(2);
    });

    it("再生元の一覧を使う（プレイリストから始めたらプレイリスト）", async () => {
      const { store, loadMedia } = setup();
      await store.play(song("p1"), "playlist");
      store.next();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["p1", "p2"]);
    });

    it("何も再生していなければ何もしない", () => {
      const { store, loadMedia } = setup();
      store.next();
      store.prev();
      expect(loadMedia).not.toHaveBeenCalled();
    });
  });

  describe("再生モード", () => {
    it("同じモードをもう一度押すと通常に戻り、保存される", () => {
      const { store } = setup();
      store.setPlayMode("shuffle");
      expect(store.playMode).toBe("shuffle");
      expect(loadSettings().playMode).toBe("shuffle");
      store.setPlayMode("repeatOne");
      expect(store.playMode).toBe("repeatOne");
      store.setPlayMode("repeatOne");
      expect(store.playMode).toBe("normal");
      expect(loadSettings().playMode).toBe("normal");
    });

    it("保存されたモードで始まる。壊れた値は通常", () => {
      localStorage.setItem(
        "gdp:settings",
        JSON.stringify({ version: 1, playMode: "shuffle" }),
      );
      setActivePinia(createPinia());
      expect(usePlayerStore().playMode).toBe("shuffle");

      localStorage.setItem("gdp:settings", JSON.stringify({ playMode: "x" }));
      setActivePinia(createPinia());
      expect(usePlayerStore().playMode).toBe("normal");
    });

    it("曲が終わったら次の曲へ。1 曲リピートなら同じ曲を頭から", async () => {
      const { store, audio, loadMedia, emit } = setup();
      await store.play(song("a"), "drive");
      emit().ended?.();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "b"]);

      store.setPlayMode("repeatOne");
      emit().ended?.();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "b"]);
      expect(audio.seek).toHaveBeenCalledWith(0);
      expect(store.status).toBe("playing");
    });

    it("1 曲リピート中でも、次へボタンは一覧の次へ進む", async () => {
      const { store, loadMedia } = setup();
      await store.play(song("a"), "drive");
      store.setPlayMode("repeatOne");
      store.next();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "b"]);
    });

    it("シャッフルは一巡するまで同じ曲を出さない", async () => {
      const { store, loadMedia } = setup(undefined, () => 0);
      store.setPlayMode("shuffle");
      await store.play(song("a"), "drive");
      for (let i = 0; i < 3; i++) {
        store.next();
        await flushPromises();
      }
      // a, b, c と一巡し、次の巡目は c 以外から始まる
      expect(playedIds(loadMedia)).toEqual(["a", "b", "c", "a"]);
    });

    it("シャッフル中の前の曲は、再生した順の履歴を戻る。戻れなければ頭へ", async () => {
      const { store, audio, loadMedia } = setup(undefined, () => 0);
      store.setPlayMode("shuffle");
      await store.play(song("a"), "drive");
      store.next();
      await flushPromises();
      store.prev();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "b", "a"]);

      audio.seek.mockClear();
      store.prev();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "b", "a"]);
      expect(audio.seek).toHaveBeenCalledWith(0);
    });
  });

  describe("再生エラー", () => {
    it("再生できない曲は知らせて、次の曲へ進む", async () => {
      const { store, loadMedia } = setup();
      loadMedia.mockRejectedValueOnce(new Error("boom"));
      await store.play(song("a"), "drive");
      await flushPromises();
      expect(useToast().toasts.value[0]).toMatchObject({
        type: "error",
        text: "このファイルは再生できません",
      });
      expect(playedIds(loadMedia)).toEqual(["a", "b"]);
      expect(store.current?.id).toBe("b");
      expect(store.status).toBe("playing");
    });

    it("連続 3 曲エラーなら止まる。1 曲でも再生できたら数え直す", async () => {
      const { store, loadMedia, lists, emit } = setup();
      lists.drive = ["a", "b", "c", "d", "e"].map(song);
      loadMedia.mockImplementation(() => Promise.reject(new Error("boom")));
      await store.play(song("a"), "drive");
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "b", "c"]);
      expect(store.status).toBe("error");

      loadMedia.mockReset();
      loadMedia.mockRejectedValueOnce(new Error("x"));
      loadMedia.mockRejectedValueOnce(new Error("x"));
      loadMedia.mockResolvedValueOnce({ url: "blob:c", revoke: vi.fn() });
      loadMedia.mockRejectedValueOnce(new Error("x"));
      loadMedia.mockRejectedValueOnce(new Error("x"));
      loadMedia.mockResolvedValue({ url: "blob:z", revoke: vi.fn() });
      await store.play(song("a"), "drive");
      await flushPromises();
      // a・b がエラー → c は再生できた
      expect(store.current?.id).toBe("c");
      expect(store.status).toBe("playing");

      // 曲の終わりで進む: d・e がエラー → 数え直しているので止まらず、a を再生できた
      emit().ended?.();
      await flushPromises();
      expect(loadMedia).toHaveBeenCalledTimes(6);
      expect(store.current?.id).toBe("a");
      expect(store.status).toBe("playing");
    });

    it("一覧が 1 曲だけなら、進まずに止まる", async () => {
      const { store, loadMedia, lists } = setup();
      lists.drive = [song("a")];
      loadMedia.mockRejectedValueOnce(new Error("boom"));
      await store.play(song("a"), "drive");
      await flushPromises();
      expect(loadMedia).toHaveBeenCalledTimes(1);
      expect(store.status).toBe("error");
    });

    it("<audio> の再生エラーでも次の曲へ進む", async () => {
      const { store, loadMedia, emit } = setup();
      await store.play(song("a"), "drive");
      emit().error?.();
      await flushPromises();
      expect(playedIds(loadMedia)).toEqual(["a", "b"]);
    });
  });

  describe("操作", () => {
    it("toggle: 再生中なら停止、停止中なら再開。曲がない・読み込み中は何もしない", async () => {
      const { store, audio, loadMedia } = setup();
      expect(store.toggle()).toBeNull();

      const slow = deferred<LoadedMedia>();
      loadMedia.mockReturnValueOnce(slow.promise);
      const pending = store.play(song("a"), "drive");
      expect(store.toggle()).toBeNull();
      slow.resolve({ url: "blob:a", revoke: vi.fn() });
      await pending;

      expect(store.toggle()).toBe("pause");
      expect(audio.pause).toHaveBeenCalled();
      expect(store.status).toBe("paused");

      expect(store.toggle()).toBe("play");
      await flushPromises();
      expect(store.status).toBe("playing");
    });

    it("エラーで止まったあとの toggle は、その曲を読み込み直す", async () => {
      const { store, loadMedia, lists } = setup();
      lists.drive = [song("a")];
      loadMedia.mockRejectedValueOnce(new Error("boom"));
      await store.play(song("a"), "drive");
      expect(store.status).toBe("error");
      expect(store.toggle()).toBe("play");
      await flushPromises();
      expect(loadMedia).toHaveBeenCalledTimes(2);
      expect(store.status).toBe("playing");
    });

    it("seek と restart は、曲があるときだけ位置を変える", async () => {
      const { store, audio } = setup();
      store.seek(10);
      store.restart();
      expect(audio.seek).not.toHaveBeenCalled();

      await store.play(song("a"), "drive");
      store.seek(42);
      expect(audio.seek).toHaveBeenLastCalledWith(42);
      expect(store.currentTime).toBe(42);
      store.restart();
      expect(audio.seek).toHaveBeenLastCalledWith(0);
      expect(store.currentTime).toBe(0);
    });

    it("<audio> の状態の変化を反映する", async () => {
      const { store, emit } = setup();
      await store.play(song("a"), "drive");
      emit().timeUpdate?.(12.5);
      emit().durationChange?.(200);
      expect(store.currentTime).toBe(12.5);
      expect(store.duration).toBe(200);

      emit().paused?.();
      expect(store.status).toBe("paused");
      emit().playing?.();
      expect(store.status).toBe("playing");
    });

    it("stop で再生をやめて、曲を手放す", async () => {
      const { store, audio, revokes } = setup();
      await store.play(song("a"), "drive");
      store.stop();
      expect(audio.clearSource).toHaveBeenCalled();
      expect(revokes.get("a")).toHaveBeenCalledTimes(1);
      expect(store.current).toBeNull();
      expect(store.source).toBeNull();
      expect(store.status).toBe("idle");
    });

    it("読み込み中に stop すると、その結果は捨てる", async () => {
      const { store, audio, loadMedia } = setup();
      const slow = deferred<LoadedMedia>();
      loadMedia.mockReturnValueOnce(slow.promise);
      const pending = store.play(song("a"), "drive");
      store.stop();
      const revoke = vi.fn();
      slow.resolve({ url: "blob:a", revoke });
      await pending;
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(audio.setSource).not.toHaveBeenCalled();
      expect(store.status).toBe("idle");
    });
  });
});
