/**
 * 構成: 画面 ─ Worker（SoundTouch の計算）─ AudioWorklet（再生だけ）
 * 計算は Worker が先回りして行い、できた音を AudioWorklet が順に流す。
 * 計算が多少もたついても、先回り分（バッファ）があるので途切れない。
 */

/** 1 回に Worker が作る音のフレーム数 */
export const CHUNK_FRAMES = 2048;
/** AudioWorklet が先回りで溜めておく目標（フレーム）。約 190ms */
export const TARGET_BUFFER_FRAMES = 8192;

/** 画面 → Worker */
export type ToWorker =
  | { type: "connect"; port: MessagePort }
  | { type: "load"; channels: Float32Array[]; sampleRate: number }
  | { type: "params"; pitchSemitones: number; speed: number };

/** Worker → 画面 */
export type FromWorker = { type: "loaded" };

/** AudioWorklet → Worker（MessagePort 経由） */
export type WorkletToWorker =
  | { type: "seek"; seconds: number; generation: number }
  | { type: "need"; generation: number };

/** Worker → AudioWorklet（MessagePort 経由） */
export type WorkerToWorklet = {
  type: "chunk";
  generation: number;
  /** 元の曲の中での、この音の先頭の位置（秒）と、最後の位置（秒） */
  startPosition: number;
  endPosition: number;
  left: Float32Array;
  right: Float32Array;
  /** 曲の終わりまで作り終えた */
  last: boolean;
};

/** 画面 → AudioWorklet */
export type ToProcessor =
  | { type: "connect"; port: MessagePort }
  | { type: "play" }
  | { type: "pause" }
  | { type: "seek"; seconds: number };

/** AudioWorklet → 画面 */
export type FromProcessor =
  | {
      type: "state";
      /** 元の曲の中での再生位置（秒） */
      position: number;
      playing: boolean;
      /** 溜まっている音の量（ms） */
      bufferedMs: number;
      /** 音が足りず、途切れた回数（累計） */
      underruns: number;
    }
  | { type: "ended" };

export const PROCESSOR_NAME = "practice-soundtouch";
