import { ref } from "vue";
import { defineStore } from "pinia";
import { AuthExpiredError, useAuthStore } from "@/features/auth";
import { createDriveApi, type DriveItem } from "@/features/drive";
import { loadSettings, patchSettings } from "@/shared/storage/settings";
import { useToast } from "@/shared/ui/useToast";
import {
  createAudioPlayer,
  type AudioEvents,
  type AudioPlayer,
} from "./audio-element";
import { loadMedia, type LoadedMedia, type LoadOptions } from "./media-loader";
import {
  createShuffleQueue,
  pickNextInList,
  pickPrevInList,
} from "./play-queue";

/** 再生元の一覧 */
export type PlaySource = "playlist" | "drive";
export type PlayMode = "normal" | "repeatOne" | "shuffle";
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";
export type PlayableItem = DriveItem;

const PLAY_MODES: readonly PlayMode[] = ["normal", "repeatOne", "shuffle"];
/** 再生できない曲がこの回数続いたら、次の曲へ進むのをやめる */
const MAX_CONSECUTIVE_ERRORS = 3;

function isPlayMode(value: unknown): value is PlayMode {
  return PLAY_MODES.includes(value as PlayMode);
}

/** store が外に頼るもの。テストで差し替える */
export interface PlayerDeps {
  audio: AudioPlayer;
  loadMedia(item: PlayableItem, options: LoadOptions): Promise<LoadedMedia>;
  /** 再生元の、今の曲の一覧（再生できる曲だけ。並べ替え後の順序） */
  getItems(source: PlaySource): PlayableItem[];
  random(): number;
}

/**
 * 再生の状態と操作。
 *
 * - 次・前の曲は、再生元の一覧の「今の並び」から選ぶ。
 * - 曲は全体を取得してから再生する。前の曲の Blob URL は、次の曲を渡したあとに解放する。
 * - 再生できない曲は次へ進む（連続 3 曲で止まる）。
 */
export const usePlayerStore = defineStore("player", () => {
  const toast = useToast();

  const current = ref<PlayableItem | null>(null);
  const source = ref<PlaySource | null>(null);
  const status = ref<PlayerStatus>("idle");
  const currentTime = ref(0);
  const duration = ref(0);
  /** 曲の取得の進み具合（0〜1） */
  const loadedRatio = ref(0);
  const savedMode = loadSettings().playMode;
  const playMode = ref<PlayMode>(isPlayMode(savedMode) ? savedMode : "normal");

  const overrides: Partial<PlayerDeps> = {};
  let resolved: PlayerDeps | null = null;
  let controller: AbortController | null = null;
  /** play() のたびに増やす。古い読み込みの結果を捨てるための印 */
  let playToken = 0;
  let currentMedia: LoadedMedia | null = null;
  /** <audio> に曲を渡してあるか */
  let hasSource = false;
  let consecutiveErrors = 0;
  /** エラーで次の曲へ進んでいる間だけ true（この間の play は、エラーの連続に数える） */
  let advancingAfterError = false;
  const shuffle = createShuffleQueue(() => deps().random());

  const handlers: Partial<AudioEvents> = {
    timeUpdate: (seconds) => {
      currentTime.value = seconds;
    },
    durationChange: (seconds) => {
      duration.value = seconds;
    },
    playing: () => {
      status.value = "playing";
      consecutiveErrors = 0;
    },
    paused: () => {
      if (status.value === "playing") {
        status.value = "paused";
      }
    },
    ended: () => {
      status.value = "paused";
      if (playMode.value === "repeatOne") {
        void replay();
      } else {
        next();
      }
    },
    error: () => {
      handlePlaybackError();
    },
  };

  function deps(): PlayerDeps {
    if (!resolved) {
      resolved = {
        audio: overrides.audio ?? createAudioPlayer(),
        loadMedia:
          overrides.loadMedia ??
          ((item, options) =>
            loadMedia(createDriveApi(useAuthStore()), item, options)),
        getItems: overrides.getItems ?? (() => []),
        random: overrides.random ?? Math.random,
      };
      resolved.audio.subscribe(handlers);
    }
    return resolved;
  }

  /** 外に頼るものを差し替える（再生元の一覧の提供・テスト用） */
  function configure(next: Partial<PlayerDeps>): void {
    Object.assign(overrides, next);
    if (resolved) {
      Object.assign(resolved, next);
      next.audio?.subscribe(handlers);
    }
  }

  function handlePlaybackError(): void {
    toast.show("このファイルは再生できません", { type: "error" });
    consecutiveErrors += 1;
    status.value = "error";
    const items = source.value ? deps().getItems(source.value) : [];
    if (consecutiveErrors < MAX_CONSECUTIVE_ERRORS && items.length > 1) {
      advancingAfterError = true;
      next();
      advancingAfterError = false;
    }
  }

  /** 曲を取得して再生する。読み込み中の曲があれば中止する */
  async function play(item: PlayableItem, from: PlaySource): Promise<void> {
    if (from !== source.value) {
      shuffle.reset();
    }
    if (!advancingAfterError) {
      // 利用者の操作（または曲の終わり）で始めた再生は、エラーの連続を数え直す
      consecutiveErrors = 0;
    }
    controller?.abort();
    const own = new AbortController();
    controller = own;
    const token = ++playToken;

    current.value = item;
    source.value = from;
    status.value = "loading";
    currentTime.value = 0;
    duration.value = 0;
    loadedRatio.value = 0;
    shuffle.noteStarted(item.id);

    let media: LoadedMedia;
    try {
      media = await deps().loadMedia(item, {
        signal: own.signal,
        onProgress: (ratio) => {
          if (token === playToken) {
            loadedRatio.value = ratio;
          }
        },
      });
    } catch (e) {
      if (token !== playToken) {
        return;
      }
      if (e instanceof AuthExpiredError) {
        // サインイン画面への切り替えは、認証状態の変化を受けたルーターが行う
        status.value = "idle";
        return;
      }
      handlePlaybackError();
      return;
    }
    if (token !== playToken) {
      media.revoke();
      return;
    }

    const { audio } = deps();
    audio.setSource(media.url);
    // 再生中の URL を先に解放しないよう、新しい曲を渡したあとに前の曲を解放する
    currentMedia?.revoke();
    currentMedia = media;
    hasSource = true;

    try {
      await audio.play();
    } catch {
      // ブラウザに拒否された（iOS で操作から時間が空いたとき）。再生ボタンで再開できる
      if (token === playToken) {
        status.value = "paused";
      }
      return;
    }
    if (token === playToken) {
      status.value = "playing";
      consecutiveErrors = 0;
    }
  }

  /** 今の曲を頭から再生し直す（曲が読み込めていなければ読み込み直す） */
  async function replay(): Promise<void> {
    const item = current.value;
    if (!item || !source.value) {
      return;
    }
    if (!hasSource) {
      await play(item, source.value);
      return;
    }
    const { audio } = deps();
    audio.seek(0);
    currentTime.value = 0;
    try {
      await audio.play();
      status.value = "playing";
    } catch {
      status.value = "paused";
    }
  }

  function advance(direction: "next" | "prev"): void {
    const from = source.value;
    if (!from) {
      return;
    }
    const items = deps().getItems(from);
    const currentId = current.value?.id;
    let item: PlayableItem | null;
    if (playMode.value === "shuffle") {
      item =
        direction === "next"
          ? shuffle.next(items, currentId)
          : shuffle.previous(items, currentId);
    } else {
      item =
        direction === "next"
          ? pickNextInList(items, currentId)
          : pickPrevInList(items, currentId);
    }
    if (!item) {
      if (direction === "prev") {
        restart();
      }
      return;
    }
    if (item.id === currentId) {
      // 一覧に 1 曲しかない
      void replay();
      return;
    }
    void play(item, from);
  }

  function next(): void {
    advance("next");
  }

  /** 前の曲へ */
  function prev(): void {
    advance("prev");
  }

  /** 今の曲の頭へ戻る（再生・停止の状態は変えない） */
  function restart(): void {
    if (!current.value || !hasSource) {
      return;
    }
    deps().audio.seek(0);
    currentTime.value = 0;
  }

  function pause(): void {
    if (status.value === "playing") {
      deps().audio.pause();
      status.value = "paused";
    }
  }

  async function resume(): Promise<void> {
    const item = current.value;
    const from = source.value;
    if (!item || !from) {
      return;
    }
    if (status.value === "paused" && hasSource) {
      try {
        await deps().audio.play();
        status.value = "playing";
      } catch {
        status.value = "paused";
      }
    } else if (status.value === "idle" || status.value === "error") {
      await play(item, from);
    }
  }

  /** 再生・停止を切り替える。したことを返す（曲がない・読み込み中は null） */
  function toggle(): "play" | "pause" | null {
    if (!current.value) {
      return null;
    }
    if (status.value === "playing") {
      pause();
      return "pause";
    }
    if (status.value === "loading") {
      return null;
    }
    void resume();
    return "play";
  }

  function seek(seconds: number): void {
    if (!hasSource) {
      return;
    }
    deps().audio.seek(seconds);
    currentTime.value = seconds;
  }

  /** 同じモードをもう一度押すと通常に戻る */
  function setPlayMode(mode: PlayMode): void {
    playMode.value = playMode.value === mode ? "normal" : mode;
    patchSettings({ playMode: playMode.value });
    shuffle.reset();
    if (current.value) {
      shuffle.noteStarted(current.value.id);
    }
  }

  /** 再生をやめて、曲を手放す（サインアウトしたときなど） */
  function stop(): void {
    controller?.abort();
    controller = null;
    playToken += 1;
    resolved?.audio.clearSource();
    currentMedia?.revoke();
    currentMedia = null;
    hasSource = false;
    consecutiveErrors = 0;
    shuffle.reset();
    current.value = null;
    source.value = null;
    status.value = "idle";
    currentTime.value = 0;
    duration.value = 0;
    loadedRatio.value = 0;
  }

  return {
    current,
    source,
    status,
    currentTime,
    duration,
    loadedRatio,
    playMode,
    configure,
    play,
    next,
    prev,
    restart,
    pause,
    resume,
    toggle,
    seek,
    setPlayMode,
    stop,
  };
});
