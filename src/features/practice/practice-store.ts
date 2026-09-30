import { ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "@/features/auth";
import { createDriveApi, type DriveItem } from "@/features/drive";
import {
  createWebAudioEngine,
  type EngineEvents,
  type PracticeEngine,
} from "./engine/engine";
import {
  MAX_DURATION_SECONDS,
  SPEED_STEP,
  clampPitch,
  clampSpeed,
} from "./params";
import { nextPosition, prevPosition } from "./seek-layout";
import { computeOverview, type RowPeaks } from "./waveform";

export type PracticePhase =
  "idle" | "downloading" | "decoding" | "ready" | "error";

/** 練習する曲（メインから引き継ぐ） */
export type PracticeSong = Pick<DriveItem, "id" | "name" | "mimeType">;

/** store が外に頼るもの。テストで差し替える */
export interface PracticeDeps {
  createEngine(events: EngineEvents): PracticeEngine;
  download(
    song: PracticeSong,
    onProgress: (ratio: number) => void,
  ): Promise<Blob>;
}

/**
 * 練習ビューの状態と操作。
 * 設定（ピッチ・速度・位置）は保存しない。open のたびに、ピッチ 0・速度 1 倍・先頭から始まる。
 */
export const usePracticeStore = defineStore("practice", () => {
  const phase = ref<PracticePhase>("idle");
  const progress = ref(0);
  const error = ref("");
  const duration = ref(0);
  const position = ref(0);
  const playing = ref(false);
  const pitch = ref(0);
  const speed = ref(1);
  const scrubbing = ref(false);
  /** 最後にタップした位置（秒）。タップのたびに更新する。開いた直後はなし */
  const marker = ref<number | null>(null);
  /** 波形の集計結果（大きいので、深い監視はしない） */
  const overview = shallowRef<RowPeaks[] | null>(null);

  const overrides: Partial<PracticeDeps> = {};
  let engine: PracticeEngine | null = null;
  /** open / close のたびに増やす。古い読み込みの結果を捨てるための印 */
  let token = 0;
  let resumeAfterScrub = false;

  function deps(): PracticeDeps {
    return {
      createEngine: overrides.createEngine ?? createWebAudioEngine,
      download:
        overrides.download ??
        ((song, onProgress) =>
          createDriveApi(useAuthStore()).downloadFile(song.id, {
            mimeType: song.mimeType,
            onProgress,
          })),
    };
  }

  /** テスト用: 外部とのやりとりを差し替える */
  function setDeps(next: Partial<PracticeDeps>): void {
    Object.assign(overrides, next);
  }

  const events: EngineEvents = {
    state: (state) => {
      if (scrubbing.value) {
        return;
      }
      // 再生中かどうかは store が持つ（エンジンの報告は使わない）
      position.value = state.position;
    },
    ended: () => {
      playing.value = false;
      position.value = 0;
    },
  };

  function reset(): void {
    phase.value = "idle";
    progress.value = 0;
    error.value = "";
    duration.value = 0;
    position.value = 0;
    playing.value = false;
    pitch.value = 0;
    speed.value = 1;
    scrubbing.value = false;
    marker.value = null;
    overview.value = null;
    resumeAfterScrub = false;
  }

  function dispose(): void {
    engine?.dispose();
    engine = null;
  }

  function fail(message: string): void {
    dispose();
    error.value = message;
    phase.value = "error";
  }

  /** 曲を読み込んで、練習できる状態にする */
  async function open(song: PracticeSong): Promise<void> {
    close();
    const mine = ++token;
    const alive = () => mine === token;
    phase.value = "downloading";
    try {
      const created = deps().createEngine(events);
      engine = created;
      await created.init();
      if (!alive()) {
        return;
      }
      const blob = await deps().download(song, (ratio) => {
        if (alive()) {
          progress.value = ratio;
        }
      });
      if (!alive()) {
        return;
      }
      phase.value = "decoding";
      const audio = await created.decode(await blob.arrayBuffer());
      if (!alive()) {
        return;
      }
      if (audio.duration > MAX_DURATION_SECONDS) {
        fail("長すぎて読み込めません（上限 15 分）");
        return;
      }
      // 波形は、エンジンへ渡す（＝使えなくなる）前に集計する
      overview.value = computeOverview(audio.channels);
      duration.value = audio.duration;
      await created.load(audio);
      if (!alive()) {
        return;
      }
      created.setParams(pitch.value, speed.value);
      phase.value = "ready";
    } catch (e) {
      if (alive()) {
        fail(e instanceof Error ? e.message : String(e));
      }
    }
  }

  /** 後片付け。画面を離れるときに呼ぶ */
  function close(): void {
    token += 1;
    dispose();
    reset();
  }

  async function play(): Promise<void> {
    if (phase.value !== "ready" || !engine) {
      return;
    }
    playing.value = true;
    await engine.play();
  }

  function pause(): void {
    if (phase.value !== "ready" || !engine) {
      return;
    }
    playing.value = false;
    engine.pause();
  }

  /** 再生 / 一時停止を切り替える。Space キー用に、したことを返す */
  function toggle(): "play" | "pause" | null {
    if (phase.value !== "ready") {
      return null;
    }
    if (playing.value) {
      pause();
      return "pause";
    }
    void play();
    return "play";
  }

  /** タップでの移動。再生中なら、そのまま続けて鳴らす */
  function seek(seconds: number): void {
    if (phase.value !== "ready" || !engine) {
      return;
    }
    position.value = seconds;
    engine.seek(seconds);
  }

  /** シークバーのタップ。位置へ移り、その位置にマーカーを置く（古いマーカーは消える） */
  function tap(seconds: number): void {
    if (phase.value !== "ready") {
      return;
    }
    marker.value = seconds;
    seek(seconds);
  }

  /** 「戻る」ボタン。マーカーより後ろならマーカーへ、それ以外（1 秒以内など）は先頭へ */
  function prev(): void {
    seek(prevPosition(position.value, marker.value));
  }

  /** 「進む」ボタン。再生位置がマーカーより前ならマーカーへ。それ以外は何もしない */
  function next(): void {
    const target = nextPosition(position.value, marker.value);
    if (target !== null) {
      seek(target);
    }
  }

  /** ドラッグの開始。音は止める（再生中だったかは覚えておく） */
  function beginScrub(): void {
    if (phase.value !== "ready" || !engine || scrubbing.value) {
      return;
    }
    scrubbing.value = true;
    resumeAfterScrub = playing.value;
    if (playing.value) {
      engine.pause();
    }
  }

  /** ドラッグ中。表示の位置だけ動かす */
  function scrubTo(seconds: number): void {
    if (scrubbing.value) {
      position.value = seconds;
    }
  }

  /** ドラッグの終わり。離した位置から、再生中だったなら再開する */
  function endScrub(seconds: number): void {
    if (!scrubbing.value || !engine) {
      return;
    }
    scrubbing.value = false;
    position.value = seconds;
    engine.seek(seconds);
    if (resumeAfterScrub) {
      void engine.play();
    }
    resumeAfterScrub = false;
  }

  function stepPitch(delta: number): void {
    setPitch(pitch.value + delta);
  }

  function stepSpeed(direction: 1 | -1): void {
    setSpeed(speed.value + direction * SPEED_STEP);
  }

  function setPitch(value: number): void {
    pitch.value = clampPitch(value);
    engine?.setParams(pitch.value, speed.value);
  }

  function setSpeed(value: number): void {
    speed.value = clampSpeed(value);
    engine?.setParams(pitch.value, speed.value);
  }

  /** 画面へ戻ったとき、止まっていた AudioContext を再開する */
  function recover(): void {
    if (playing.value) {
      void engine?.resume();
    }
  }

  return {
    phase,
    progress,
    error,
    duration,
    position,
    playing,
    pitch,
    speed,
    scrubbing,
    marker,
    overview,
    setDeps,
    open,
    close,
    play,
    pause,
    toggle,
    seek,
    tap,
    prev,
    next,
    beginScrub,
    scrubTo,
    endScrub,
    setPitch,
    setSpeed,
    stepPitch,
    stepSpeed,
    recover,
  };
});
