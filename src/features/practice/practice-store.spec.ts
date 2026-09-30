import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DecodedAudio,
  EngineEvents,
  PracticeEngine,
} from "./engine/engine";
import { usePracticeStore, type PracticeSong } from "./practice-store";

// エンジンの本物は Worker や AudioWorklet を読み込むので、テストでは使わない
vi.mock("./engine/engine", () => ({ createWebAudioEngine: vi.fn() }));

const SONG: PracticeSong = {
  id: "s1",
  name: "song.mp3",
  mimeType: "audio/mpeg",
};

interface FakeEngine extends PracticeEngine {
  calls: string[];
  events: EngineEvents;
  initCount: number;
}

function audio(duration = 100): DecodedAudio {
  return {
    channels: [new Float32Array(1000)],
    sampleRate: 10,
    duration,
  };
}

function fakeEngine(events: EngineEvents, decoded = audio()): FakeEngine {
  const calls: string[] = [];
  const engine: FakeEngine = {
    calls,
    events,
    initCount: 0,
    init: () => {
      engine.initCount += 1;
      return Promise.resolve();
    },
    decode: () => Promise.resolve(decoded),
    load: () => {
      calls.push("load");
      return Promise.resolve();
    },
    play: () => {
      calls.push("play");
      return Promise.resolve();
    },
    pause: () => {
      calls.push("pause");
    },
    seek: (seconds) => {
      calls.push(`seek:${seconds}`);
    },
    setParams: (pitch, speed) => {
      calls.push(`params:${pitch}:${speed}`);
    },
    resume: () => {
      calls.push("resume");
      return Promise.resolve();
    },
    dispose: () => {
      calls.push("dispose");
    },
  };
  return engine;
}

async function setup(decoded?: DecodedAudio) {
  const store = usePracticeStore();
  let engine!: FakeEngine;
  store.setDeps({
    createEngine: (events) => {
      engine = fakeEngine(events, decoded);
      return engine;
    },
    download: (_song, onProgress) => {
      onProgress(0.5);
      return Promise.resolve(new Blob(["x"]));
    },
  });
  await store.open(SONG);
  return { store, engine };
}

describe("practice-store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("曲を読み込むと ready になり、初期値は ピッチ 0・速度 1・先頭", async () => {
    const { store, engine } = await setup();
    expect(store.phase).toBe("ready");
    expect(store.duration).toBe(100);
    expect(store.pitch).toBe(0);
    expect(store.speed).toBe(1);
    expect(store.position).toBe(0);
    expect(store.playing).toBe(false);
    expect(store.overview).toHaveLength(10);
    expect(engine.calls).toContain("load");
    expect(engine.calls).toContain("params:0:1");
  });

  it("15 分を超える曲は読み込まずにエラーにして、エンジンを片付ける", async () => {
    const { store, engine } = await setup(audio(15 * 60 + 1));
    expect(store.phase).toBe("error");
    expect(store.error).toBe("長すぎて読み込めません（上限 15 分）");
    expect(engine.calls).toContain("dispose");
    expect(engine.calls).not.toContain("load");
  });

  it("ダウンロードに失敗したらエラーを表示する", async () => {
    const store = usePracticeStore();
    let engine!: FakeEngine;
    store.setDeps({
      createEngine: (events) => {
        engine = fakeEngine(events);
        return engine;
      },
      download: () => Promise.reject(new Error("通信に失敗しました")),
    });
    await store.open(SONG);
    expect(store.phase).toBe("error");
    expect(store.error).toBe("通信に失敗しました");
    expect(engine.calls).toContain("dispose");
  });

  it("再生・一時停止を切り替え、したことを返す", async () => {
    const { store, engine } = await setup();
    expect(store.toggle()).toBe("play");
    expect(store.playing).toBe(true);
    expect(store.toggle()).toBe("pause");
    expect(store.playing).toBe(false);
    expect(engine.calls.filter((c) => c === "play")).toHaveLength(1);
    expect(engine.calls.filter((c) => c === "pause")).toHaveLength(1);
  });

  it("読み込み前は toggle が null を返す", () => {
    expect(usePracticeStore().toggle()).toBeNull();
  });

  it("ピッチと速度は範囲内に収めて、エンジンへ渡す", async () => {
    const { store, engine } = await setup();
    store.setPitch(20);
    expect(store.pitch).toBe(12);
    store.setSpeed(0.1);
    expect(store.speed).toBe(0.25);
    expect(engine.calls[engine.calls.length - 1]).toBe("params:12:0.25");
  });

  it("タップでのシークは、再生の状態を変えずに位置だけ移す", async () => {
    const { store, engine } = await setup();
    void store.toggle();
    store.seek(42);
    expect(store.position).toBe(42);
    expect(store.playing).toBe(true);
    expect(engine.calls).toContain("seek:42");
  });

  it("ドラッグ中は音を止め、離した位置から再開する（再生中だった場合）", async () => {
    const { store, engine } = await setup();
    void store.toggle();
    engine.calls.length = 0;
    store.beginScrub();
    expect(engine.calls).toEqual(["pause"]);
    store.scrubTo(30);
    expect(store.position).toBe(30);
    // ドラッグ中はエンジンからの位置の報告を無視する
    engine.events.state({ position: 5 });
    expect(store.position).toBe(30);
    store.endScrub(60);
    expect(engine.calls).toEqual(["pause", "seek:60", "play"]);
    expect(store.position).toBe(60);
    expect(store.playing).toBe(true);
  });

  it("停止中のドラッグは、位置だけ移して再生はしない", async () => {
    const { store, engine } = await setup();
    engine.calls.length = 0;
    store.beginScrub();
    store.endScrub(60);
    expect(engine.calls).toEqual(["seek:60"]);
    expect(store.playing).toBe(false);
  });

  it("エンジンからの位置の報告を反映する", async () => {
    const { store, engine } = await setup();
    engine.events.state({ position: 12.5 });
    expect(store.position).toBe(12.5);
  });

  it("曲の終わりで停止し、先頭に戻る", async () => {
    const { store, engine } = await setup();
    void store.toggle();
    engine.events.state({ position: 99 });
    engine.events.ended();
    expect(store.playing).toBe(false);
    expect(store.position).toBe(0);
  });

  it("画面へ戻ったとき、再生中なら AudioContext を再開する", async () => {
    const { store, engine } = await setup();
    store.recover();
    expect(engine.calls).not.toContain("resume");
    void store.toggle();
    store.recover();
    expect(engine.calls).toContain("resume");
  });

  it("close で後片付けをして、初期状態に戻る", async () => {
    const { store, engine } = await setup();
    store.setPitch(3);
    store.close();
    expect(engine.calls).toContain("dispose");
    expect(store.phase).toBe("idle");
    expect(store.pitch).toBe(0);
    expect(store.overview).toBeNull();
  });

  it("読み込み中に close されたら、結果を捨てる", async () => {
    const store = usePracticeStore();
    let release: (blob: Blob) => void = () => undefined;
    let engine!: FakeEngine;
    store.setDeps({
      createEngine: (events) => {
        engine = fakeEngine(events);
        return engine;
      },
      download: () =>
        new Promise<Blob>((resolve) => {
          release = resolve;
        }),
    });
    const opening = store.open(SONG);
    await vi.waitFor(() => {
      expect(engine.initCount).toBe(1);
    });
    store.close();
    release(new Blob(["x"]));
    await opening;
    expect(store.phase).toBe("idle");
    expect(engine.calls).not.toContain("load");
  });
});
