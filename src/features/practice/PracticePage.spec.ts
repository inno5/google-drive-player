import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineEvents, PracticeEngine } from "./engine/engine";
import PracticePage from "./PracticePage.vue";
import { usePracticeStore } from "./practice-store";

vi.mock("./engine/engine", () => ({ createWebAudioEngine: vi.fn() }));

const SONG = { id: "s1", name: "song.mp3", mimeType: "audio/mpeg" };

function fakeEngine(): PracticeEngine {
  return {
    init: () => Promise.resolve(),
    decode: () =>
      Promise.resolve({
        channels: [new Float32Array(1000)],
        sampleRate: 10,
        duration: 100,
      }),
    load: () => Promise.resolve(),
    play: () => Promise.resolve(),
    pause: () => undefined,
    seek: () => undefined,
    setParams: () => undefined,
    resume: () => Promise.resolve(),
    dispose: () => undefined,
  };
}

function setup(song: typeof SONG | null) {
  const store = usePracticeStore();
  store.setDeps({
    createEngine: (_events: EngineEvents) => fakeEngine(),
    download: () => Promise.resolve(new Blob(["x"])),
  });
  return {
    store,
    wrapper: mount(PracticePage, { props: { song, title: "表示名" } }),
  };
}

describe("PracticePage", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("曲がないときは、メインで再生するよう案内する", () => {
    const { wrapper } = setup(null);
    expect(wrapper.text()).toContain(
      "メインビューで曲を再生してから開いてください",
    );
    expect(wrapper.find(".seekbar").exists()).toBe(false);
  });

  it("曲を読み込むと、曲名・シークバー・操作ボタンを出す", async () => {
    const { wrapper } = setup(SONG);
    await flushPromises();
    expect(wrapper.text()).toContain("表示名");
    expect(wrapper.find(".seekbar").exists()).toBe(true);
    const options = wrapper.findAll(".option").map((o) => o.text());
    expect(options).toEqual(["ピッチ0", "速度×1"]);
  });

  it("再生ボタンで再生・一時停止を切り替える", async () => {
    const { wrapper, store } = setup(SONG);
    await flushPromises();
    await wrapper.get(".play").trigger("click");
    expect(store.playing).toBe(true);
    expect(wrapper.get(".play").attributes("aria-label")).toBe("一時停止");
  });

  it("ボタンでピッチ・速度のダイアログを開いて変更できる", async () => {
    const { wrapper, store } = setup(SONG);
    await flushPromises();
    const [pitchButton, speedButton] = wrapper.findAll(".option");
    await pitchButton!.trigger("click");
    await wrapper.get("[aria-label=半音上げる]").trigger("click");
    expect(store.pitch).toBe(1);
    await wrapper.get("[aria-label=閉じる]").trigger("click");
    await speedButton!.trigger("click");
    await wrapper.get(".preset:nth-child(2)").trigger("click");
    expect(store.speed).toBe(0.5);
  });

  it("画面を離れると後片付けをする", async () => {
    const { wrapper, store } = setup(SONG);
    await flushPromises();
    wrapper.unmount();
    expect(store.phase).toBe("idle");
  });
});
