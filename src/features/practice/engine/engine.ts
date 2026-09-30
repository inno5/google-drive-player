import processorUrl from "./soundtouch-processor.ts?worker&url";
import SoundTouchWorker from "./soundtouch-worker.ts?worker";
import {
  PROCESSOR_NAME,
  type FromProcessor,
  type FromWorker,
  type ToProcessor,
  type ToWorker,
} from "./messages";

/** デコードした曲（ステレオまで） */
export interface DecodedAudio {
  channels: Float32Array[];
  sampleRate: number;
  /** 秒 */
  duration: number;
}

/** エンジンから store への通知 */
export interface EngineEvents {
  /** 再生位置（元の曲の秒） */
  state(state: { position: number }): void;
  /** 曲の終わりまで再生した */
  ended(): void;
}

/**
 * 再生エンジン。ピッチ・速度を独立に変えながら、デコード済みの曲を鳴らす。
 * store はこのインターフェースだけに頼る（テストではモックにする）。
 */
export interface PracticeEngine {
  /** AudioContext と処理スレッドを用意する。Safari のマナーモード対策もここで行う */
  init(): Promise<void>;
  decode(data: ArrayBuffer): Promise<DecodedAudio>;
  /** デコード済みの曲を渡す（channels は Worker へ移す＝呼び出し後は使えなくなる） */
  load(audio: DecodedAudio): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  /** 元の曲の位置（秒）へ移る。再生中なら続けて鳴らす */
  seek(seconds: number): void;
  setParams(pitchSemitones: number, speed: number): void;
  /** 電話・アプリ切り替えなどで止まった AudioContext を再開する */
  resume(): Promise<void>;
  dispose(): void;
}

/** ブラウザの Web Audio（AudioWorklet）と Worker で動くエンジン */
export function createWebAudioEngine(events: EngineEvents): PracticeEngine {
  let context: AudioContext | null = null;
  let node: AudioWorkletNode | null = null;
  let worker: Worker | null = null;
  let onLoaded: (() => void) | null = null;

  function sendProcessor(message: ToProcessor, transfer: Transferable[] = []) {
    node?.port.postMessage(message, transfer);
  }
  function sendWorker(message: ToWorker, transfer: Transferable[] = []) {
    worker?.postMessage(message, transfer);
  }

  return {
    async init() {
      if (context) {
        return;
      }
      const created = new AudioContext();
      // iOS 16.4 以降: マナーモードでも Web Audio が鳴るようにする
      const session = (
        navigator as Navigator & { audioSession?: { type: string } }
      ).audioSession;
      if (session) {
        try {
          session.type = "playback";
        } catch {
          // 設定できなくても再生はできる
        }
      }
      await created.audioWorklet.addModule(processorUrl);
      const workletNode = new AudioWorkletNode(created, PROCESSOR_NAME, {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      workletNode.port.onmessage = (event: MessageEvent<FromProcessor>) => {
        const message = event.data;
        if (message.type === "state") {
          events.state({ position: message.position });
        } else {
          events.ended();
        }
      };
      // 計算は Worker、再生は AudioWorklet。2 つを直接つなぐ
      const createdWorker = new SoundTouchWorker();
      createdWorker.onmessage = (event: MessageEvent<FromWorker>) => {
        if (event.data.type === "loaded") {
          onLoaded?.();
        }
      };
      context = created;
      node = workletNode;
      worker = createdWorker;
      const channel = new MessageChannel();
      sendWorker({ type: "connect", port: channel.port1 }, [channel.port1]);
      sendProcessor({ type: "connect", port: channel.port2 }, [channel.port2]);
      workletNode.connect(created.destination);
    },

    async decode(data) {
      if (!context) {
        throw new Error("エンジンが初期化されていません");
      }
      const decoded = await context.decodeAudioData(data);
      const channels = Array.from(
        { length: Math.min(decoded.numberOfChannels, 2) },
        (_, i) => decoded.getChannelData(i).slice(),
      );
      return {
        channels,
        sampleRate: decoded.sampleRate,
        duration: decoded.duration,
      };
    },

    async load(audio) {
      const loaded = new Promise<void>((resolve) => {
        onLoaded = resolve;
      });
      sendWorker(
        {
          type: "load",
          channels: audio.channels,
          sampleRate: audio.sampleRate,
        },
        audio.channels.map((data) => data.buffer),
      );
      await loaded;
      sendProcessor({ type: "seek", seconds: 0 });
    },

    async play() {
      await context?.resume();
      sendProcessor({ type: "play" });
    },

    pause() {
      sendProcessor({ type: "pause" });
    },

    seek(seconds) {
      sendProcessor({ type: "seek", seconds });
    },

    setParams(pitchSemitones, speed) {
      sendWorker({ type: "params", pitchSemitones, speed });
    },

    async resume() {
      if (context && context.state !== "running") {
        await context.resume();
      }
    },

    dispose() {
      worker?.terminate();
      worker = null;
      node?.disconnect();
      node = null;
      void context?.close();
      context = null;
    },
  };
}
