import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerBar from "./PlayerBar.vue";

function factory(props: Record<string, unknown> = {}) {
  return mount(PlayerBar, {
    props: {
      status: "paused",
      currentTime: 65,
      duration: 225,
      loadedRatio: 0.5,
      playMode: "normal",
      ...props,
    },
  });
}

describe("PlayerBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("再生位置と長さを mm:ss で表示する", () => {
    const wrapper = factory();
    expect(wrapper.get(".time-current").text()).toBe("01:05");
    expect(wrapper.get(".time-total").text()).toBe("03:45");
  });

  it("再生中は一時停止ボタン、それ以外は再生ボタンを表示する", () => {
    expect(factory({ status: "playing" }).find(".pause").exists()).toBe(true);
    expect(factory({ status: "playing" }).find(".play").exists()).toBe(false);
    for (const status of ["idle", "loading", "paused", "error"]) {
      const wrapper = factory({ status });
      expect(wrapper.find(".play").exists()).toBe(true);
      expect(wrapper.find(".pause").exists()).toBe(false);
    }
  });

  it("読み込み中だけスピナーを表示する", () => {
    expect(factory({ status: "loading" }).find(".loading").exists()).toBe(true);
    expect(factory().find(".loading").exists()).toBe(false);
  });

  it("読み込み済みの割合をシークバーの背景に反映する", () => {
    const style = factory({ loadedRatio: 0.5 }).get(".bar").attributes("style");
    expect(style).toContain("50% 100%");
  });

  it("再生・停止ボタンで toggle を emit する", async () => {
    const paused = factory();
    await paused.get(".play").trigger("click");
    expect(paused.emitted("toggle")).toHaveLength(1);
    const playing = factory({ status: "playing" });
    await playing.get(".pause").trigger("click");
    expect(playing.emitted("toggle")).toHaveLength(1);
  });

  it("シークバーの操作で seek を emit する", async () => {
    const wrapper = factory();
    await wrapper.get(".bar").setValue("120");
    expect(wrapper.emitted("seek")).toEqual([[120]]);
  });

  it("前の曲ボタン: シングルクリックで頭へ、ダブルクリックで前の曲", async () => {
    const wrapper = factory();
    await wrapper.get(".prev").trigger("click");
    expect(wrapper.emitted("restart")).toHaveLength(1);
    expect(wrapper.emitted("prev")).toBeUndefined();

    // 間隔内の 2 回目
    await wrapper.get(".prev").trigger("click");
    expect(wrapper.emitted("prev")).toHaveLength(1);
    expect(wrapper.emitted("restart")).toHaveLength(1);

    // 間隔が空いたら、またシングル
    vi.advanceTimersByTime(1000);
    await wrapper.get(".prev").trigger("click");
    expect(wrapper.emitted("restart")).toHaveLength(2);
  });

  it("次の曲・再生中の曲を表示するボタン", async () => {
    const wrapper = factory();
    await wrapper.get(".next").trigger("click");
    await wrapper.get(".locate").trigger("click");
    expect(wrapper.emitted("next")).toHaveLength(1);
    expect(wrapper.emitted("locate")).toHaveLength(1);
  });

  it("曲名の表示モードのボタンで cycleDisplayMode を emit し、現在のモードを説明に出す", async () => {
    const wrapper = factory({ displayModeLabel: "file name" });
    expect(wrapper.get(".display-mode").attributes("title")).toContain(
      "file name",
    );
    await wrapper.get(".display-mode").trigger("click");
    expect(wrapper.emitted("cycleDisplayMode")).toHaveLength(1);
  });

  it("再生モードのボタンは、押したモードを emit し、有効なモードを示す", async () => {
    const wrapper = factory({ playMode: "shuffle" });
    expect(wrapper.get(".shuffle").classes()).toContain("active");
    expect(wrapper.get(".repeat").classes()).not.toContain("active");
    await wrapper.get(".repeat").trigger("click");
    await wrapper.get(".shuffle").trigger("click");
    expect(wrapper.emitted("setPlayMode")).toEqual([
      ["repeatOne"],
      ["shuffle"],
    ]);

    expect(
      factory({ playMode: "repeatOne" }).get(".repeat").classes(),
    ).toContain("active");
  });
});
