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

  it("曲を読み込むと、曲名・シークバー・操作を出す", async () => {
    const { wrapper } = setup(SONG);
    await flushPromises();
    expect(wrapper.text()).toContain("表示名");
    expect(wrapper.find(".seekbar").exists()).toBe(true);
    expect(wrapper.text()).toContain("00:00 / 01:40");
    // 戻る・再生・進むの 3 つが並ぶ
    expect(wrapper.findAll(".transport button")).toHaveLength(3);
    const values = wrapper.findAll("[data-testid=value]").map((v) => v.text());
    expect(values).toEqual(["0", "×1"]);
    expect(wrapper.find("[data-testid=marker]").exists()).toBe(false);
  });

  it("再生ボタンで再生・一時停止を切り替える", async () => {
    const { wrapper, store } = setup(SONG);
    await flushPromises();
    await wrapper.get(".play").trigger("click");
    expect(store.playing).toBe(true);
    expect(wrapper.get(".play").attributes("aria-label")).toBe("一時停止");
  });

  it("ピッチ・速度をボタンで変え、リセットで戻せる（ダイアログは使わない）", async () => {
    const { wrapper, store } = setup(SONG);
    await flushPromises();
    await wrapper.get("[aria-label=ピッチを上げる]").trigger("click");
    await wrapper.get("[aria-label=ピッチを上げる]").trigger("click");
    expect(store.pitch).toBe(2);
    await wrapper.get("[aria-label=速度を下げる]").trigger("click");
    expect(store.speed).toBe(0.75);
    expect(wrapper.findAll("[data-testid=value]").map((v) => v.text())).toEqual(
      ["+2", "×0.75"],
    );
    await wrapper.get("[aria-label=ピッチを元に戻す]").trigger("click");
    await wrapper.get("[aria-label=速度を元に戻す]").trigger("click");
    expect(store.pitch).toBe(0);
    expect(store.speed).toBe(1);
    expect(wrapper.find("[role=dialog]").exists()).toBe(false);
  });

  it("進むボタンで、マーカーより前からマーカーへ進む。後ろでは何も起きない", async () => {
    const { wrapper, store } = setup(SONG);
    await flushPromises();
    store.tap(30);
    store.seek(10);
    await wrapper.get(".next").trigger("click");
    expect(store.position).toBe(30);
    store.seek(50);
    await wrapper.get(".next").trigger("click");
    expect(store.position).toBe(50);
  });

  it("戻るボタンで、マーカー（なければ先頭）へ戻る", async () => {
    const { wrapper, store } = setup(SONG);
    await flushPromises();
    store.tap(30);
    store.seek(50);
    await wrapper.get(".prev").trigger("click");
    expect(store.position).toBe(30);
    await wrapper.get(".prev").trigger("click");
    expect(store.position).toBe(0);
  });

  it("画面を離れると後片付けをする", async () => {
    const { wrapper, store } = setup(SONG);
    await flushPromises();
    wrapper.unmount();
    expect(store.phase).toBe("idle");
  });
});
