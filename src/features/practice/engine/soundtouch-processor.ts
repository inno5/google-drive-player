/**
 * AudioWorklet（音声専用スレッド）で動く、再生だけの処理。
 * SoundTouch の計算は Worker が先回りで行い、ここでは届いた音を順に流すだけにする。
 * 重い計算をここでしないので、計算がもたついても音は途切れにくい。
 */
import {
  CHUNK_FRAMES,
  PROCESSOR_NAME,
  TARGET_BUFFER_FRAMES,
  type FromProcessor,
  type ToProcessor,
  type WorkerToWorklet,
  type WorkletToWorker,
} from "./messages";

// AudioWorkletGlobalScope のグローバル（DOM の型定義には含まれない）
declare const sampleRate: number;
declare const currentTime: number;
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}
declare function registerProcessor(
  name: string,
  processor: new () => AudioWorkletProcessor,
): void;

/** 状態を画面へ送る間隔（秒） */
const REPORT_INTERVAL = 0.05;

interface Chunk {
  left: Float32Array;
  right: Float32Array;
  startPosition: number;
  /** 1 フレームあたり、元の曲の中で進む秒数 */
  step: number;
  last: boolean;
  /** 流し終えたフレーム数 */
  used: number;
}

class SoundTouchLabProcessor extends AudioWorkletProcessor {
  private worker: MessagePort | null = null;
  private queue: Chunk[] = [];
  private buffered = 0;
  /** Worker に頼んだが、まだ届いていないチャンクの数 */
  private pending = 0;
  private generation = 0;
  private finished = false;
  /** 曲が読み込まれ、最初のシークを受け取ったら true */
  private active = false;
  private playing = false;
  private position = 0;
  private underruns = 0;
  private lastReport = 0;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent<ToProcessor>) => {
      this.onMessage(event.data);
    };
  }

  private onMessage(message: ToProcessor): void {
    switch (message.type) {
      case "connect":
        this.worker = message.port;
        this.worker.onmessage = (e: MessageEvent<WorkerToWorklet>) => {
          this.onChunk(e.data);
        };
        break;
      case "play":
        this.playing = true;
        break;
      case "pause":
        this.playing = false;
        break;
      case "seek":
        this.seek(message.seconds);
        break;
    }
    this.report(true);
  }

  private seek(seconds: number): void {
    this.active = true;
    this.generation += 1;
    this.queue = [];
    this.buffered = 0;
    this.pending = 0;
    this.finished = false;
    this.position = seconds;
    this.sendToWorker({
      type: "seek",
      seconds,
      generation: this.generation,
    });
    this.requestMore();
  }

  private sendToWorker(message: WorkletToWorker): void {
    this.worker?.postMessage(message);
  }

  private onChunk(chunk: WorkerToWorklet): void {
    if (chunk.generation !== this.generation) {
      return;
    }
    this.pending = Math.max(0, this.pending - 1);
    const frames = chunk.left.length;
    if (frames > 0) {
      this.queue.push({
        left: chunk.left,
        right: chunk.right,
        startPosition: chunk.startPosition,
        step: (chunk.endPosition - chunk.startPosition) / frames,
        last: chunk.last,
        used: 0,
      });
      this.buffered += frames;
    }
    if (chunk.last) {
      this.finished = true;
      if (frames === 0) {
        this.queue.push({
          left: new Float32Array(0),
          right: new Float32Array(0),
          startPosition: chunk.startPosition,
          step: 0,
          last: true,
          used: 0,
        });
      }
    }
  }

  /** 先回りの目標に足りなければ、Worker に音を作ってもらう */
  private requestMore(): void {
    while (
      this.active &&
      !this.finished &&
      this.worker &&
      this.buffered + this.pending * CHUNK_FRAMES < TARGET_BUFFER_FRAMES
    ) {
      this.pending += 1;
      this.sendToWorker({ type: "need", generation: this.generation });
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const outLeft = output?.[0];
    if (!output || !outLeft) {
      return true;
    }
    const outRight = output[1];
    const frames = outLeft.length;
    outLeft.fill(0);
    outRight?.fill(0);

    if (this.playing) {
      let written = 0;
      while (written < frames) {
        const chunk = this.queue[0];
        if (!chunk) {
          break;
        }
        const count = Math.min(
          frames - written,
          chunk.left.length - chunk.used,
        );
        for (let i = 0; i < count; i++) {
          outLeft[written + i] = chunk.left[chunk.used + i] ?? 0;
          if (outRight) {
            outRight[written + i] = chunk.right[chunk.used + i] ?? 0;
          }
        }
        chunk.used += count;
        written += count;
        this.buffered -= count;
        this.position = chunk.startPosition + chunk.used * chunk.step;
        if (chunk.used >= chunk.left.length) {
          this.queue.shift();
          if (chunk.last) {
            // 曲の終わり: 止めて先頭へ戻る
            this.playing = false;
            this.post({ type: "ended" });
            this.seek(0);
            this.report(true);
            return true;
          }
        }
      }
      if (written < frames) {
        this.underruns += 1;
      }
    }
    this.requestMore();
    this.report(false);
    return true;
  }

  private report(force: boolean): void {
    if (!force && currentTime - this.lastReport < REPORT_INTERVAL) {
      return;
    }
    this.lastReport = currentTime;
    this.post({
      type: "state",
      position: this.position,
      playing: this.playing,
      bufferedMs: (this.buffered / sampleRate) * 1000,
      underruns: this.underruns,
    });
  }

  private post(message: FromProcessor): void {
    this.port.postMessage(message);
  }
}

registerProcessor(PROCESSOR_NAME, SoundTouchLabProcessor);
