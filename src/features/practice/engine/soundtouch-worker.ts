/**
 * Web Worker で動く、SoundTouch の計算部分。
 * AudioWorklet から「音がほしい」と言われたぶんを先回りで作って返す。
 * 調整値（ピッチ・速度）は、次に作る音から反映される。
 */
import { SoundTouch } from "@soundtouchjs/core";
import {
  CHUNK_FRAMES,
  type FromWorker,
  type ToWorker,
  type WorkerToWorklet,
  type WorkletToWorker,
} from "./messages";

interface WorkerScope {
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
  postMessage(message: FromWorker): void;
}
const scope = self as unknown as WorkerScope;

const FEED_FRAMES = 1024;
const FLUSH_FEEDS = 8;

let sampleRate = 44100;
let soundTouch = new SoundTouch({ sampleRate });
let channels: Float32Array[] = [];
let port: MessagePort | null = null;
let pitchSemitones = 0;
let speed = 1;

let readPos = 0;
let playedPos = 0;
let flushed = 0;
let generation = 0;
const feedBuffer = new Float32Array(FEED_FRAMES * 2);
const outBuffer = new Float32Array(CHUNK_FRAMES * 2);

function total(): number {
  return channels[0]?.length ?? 0;
}

function applyParams(): void {
  soundTouch.pitchSemitones = pitchSemitones;
  soundTouch.stretch.tempo = speed / soundTouch.virtualPitch;
}

function seekTo(frame: number): void {
  const position = Math.min(Math.max(frame, 0), total());
  soundTouch.clear();
  soundTouch.outputBuffer.clear();
  soundTouch.inputBuffer.clear();
  applyParams();
  readPos = position;
  playedPos = position;
  flushed = 0;
}

function feed(): boolean {
  const length = total();
  let frames = 0;
  if (readPos < length) {
    frames = Math.min(FEED_FRAMES, length - readPos);
    const left = channels[0];
    const right = channels[1] ?? left;
    if (!left || !right) {
      return false;
    }
    for (let i = 0; i < frames; i++) {
      feedBuffer[i * 2] = left[readPos + i] ?? 0;
      feedBuffer[i * 2 + 1] = right[readPos + i] ?? 0;
    }
    readPos += frames;
  } else if (flushed < FLUSH_FEEDS) {
    frames = FEED_FRAMES;
    feedBuffer.fill(0);
    flushed += 1;
  } else {
    return false;
  }
  soundTouch.inputBuffer.putSamples(feedBuffer, 0, frames);
  soundTouch.process();
  return true;
}

function produce(): void {
  if (!port || total() === 0) {
    return;
  }
  const buffer = soundTouch.outputBuffer;
  while (buffer.frameCount < CHUNK_FRAMES && feed()) {
    // 足りるまで入れる
  }
  const count = Math.min(buffer.frameCount, CHUNK_FRAMES);
  const last = count < CHUNK_FRAMES && readPos >= total();
  const left = new Float32Array(count);
  const right = new Float32Array(count);
  if (count > 0) {
    buffer.extract(outBuffer, 0, count);
    buffer.receive(count);
    for (let i = 0; i < count; i++) {
      left[i] = outBuffer[i * 2] ?? 0;
      right[i] = outBuffer[i * 2 + 1] ?? 0;
    }
  }
  const startPosition = playedPos / sampleRate;
  playedPos = Math.min(playedPos + count * speed, total());
  const message: WorkerToWorklet = {
    type: "chunk",
    generation,
    startPosition,
    endPosition: playedPos / sampleRate,
    left,
    right,
    last,
  };
  port.postMessage(message, [left.buffer, right.buffer]);
}

function onWorkletMessage(message: WorkletToWorker): void {
  if (message.type === "seek") {
    generation = message.generation;
    seekTo(Math.round(message.seconds * sampleRate));
  } else if (message.generation === generation) {
    produce();
  }
}

scope.onmessage = (event) => {
  const message = event.data;
  switch (message.type) {
    case "connect":
      port = message.port;
      port.onmessage = (e: MessageEvent<WorkletToWorker>) => {
        onWorkletMessage(e.data);
      };
      break;
    case "load":
      channels = message.channels;
      sampleRate = message.sampleRate;
      soundTouch = new SoundTouch({ sampleRate });
      seekTo(0);
      scope.postMessage({ type: "loaded" });
      break;
    case "params":
      pitchSemitones = message.pitchSemitones;
      speed = message.speed;
      applyParams();
      break;
  }
};
