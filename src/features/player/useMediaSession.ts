import { onBeforeUnmount, onMounted, watch } from "vue";
import type { PlayerStatus } from "./player-store";

/** ロック画面・イヤホンに出す曲情報 */
export interface NowPlayingMetadata {
  title: string;
  artist?: string;
  album?: string;
}

/** useMediaSession が player に求めるもの。player store がこの形を満たす */
export interface MediaSessionPlayer {
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  resume(): Promise<void>;
  pause(): void;
  next(): void;
  prev(): void;
  seek(seconds: number): void;
}

const SEEK_STEP_SECONDS = 10;

const ACTIONS: MediaSessionAction[] = [
  "play",
  "pause",
  "previoustrack",
  "nexttrack",
  "seekto",
  "seekbackward",
  "seekforward",
];

/**
 * ロック画面・イヤホン・キーボードのメディアキーからの操作と、曲情報の表示（Media Session API）。
 * 「前へ」は、ダブル操作ができないので前の曲へ戻る。
 */
export function useMediaSession(
  player: MediaSessionPlayer,
  getMetadata: () => NowPlayingMetadata | null,
): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return;
  }
  const session = navigator.mediaSession;

  function setHandler(
    action: MediaSessionAction,
    handler: MediaSessionActionHandler | null,
  ): void {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // 対応していない操作は無視する
    }
  }

  onMounted(() => {
    setHandler("play", () => {
      void player.resume();
    });
    setHandler("pause", () => {
      player.pause();
    });
    setHandler("previoustrack", () => {
      player.prev();
    });
    setHandler("nexttrack", () => {
      player.next();
    });
    setHandler("seekto", (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        player.seek(details.seekTime);
      }
    });
    setHandler("seekbackward", (details) => {
      player.seek(
        Math.max(
          0,
          player.currentTime - (details.seekOffset ?? SEEK_STEP_SECONDS),
        ),
      );
    });
    setHandler("seekforward", (details) => {
      player.seek(
        Math.min(
          player.duration,
          player.currentTime + (details.seekOffset ?? SEEK_STEP_SECONDS),
        ),
      );
    });
  });

  onBeforeUnmount(() => {
    for (const action of ACTIONS) {
      setHandler(action, null);
    }
    session.metadata = null;
    session.playbackState = "none";
  });

  watch(
    getMetadata,
    (metadata) => {
      session.metadata = metadata ? new MediaMetadata(metadata) : null;
    },
    { immediate: true },
  );

  watch(
    () => player.status,
    (status) => {
      session.playbackState =
        status === "playing"
          ? "playing"
          : status === "paused"
            ? "paused"
            : "none";
    },
    { immediate: true },
  );

  watch(
    () => [player.currentTime, player.duration] as const,
    ([position, length]) => {
      if (length > 0 && Number.isFinite(length)) {
        try {
          session.setPositionState({
            duration: length,
            position: Math.min(position, length),
            playbackRate: 1,
          });
        } catch {
          // 値が不正なときは無視する
        }
      }
    },
  );
}
