import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrackRow from "./TrackRow.vue";

function factory(props: Record<string, unknown> = {}) {
  return mount(TrackRow, {
    props: {
      index: 0,
      name: "song.mp3",
      kind: "audio",
      size: 1500,
      actionIcon: "add_circle_outline",
      actionLabel: "追加",
      ...props,
    },
  });
}

describe("TrackRow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("番号は 1 始まりで、名前とサイズを表示する", () => {
    const wrapper = factory({ index: 2 });
    expect(wrapper.get(".cell-no").text()).toBe("3");
    expect(wrapper.get(".name").text()).toBe("song.mp3");
    expect(wrapper.get(".cell-size").text()).toBe("1.5 kB");
  });

  it("種類でアイコンが変わる", () => {
    expect(factory({ kind: "folder" }).get(".cell-title .icon").text()).toBe(
      "folder",
    );
    expect(factory().get(".cell-title .icon").text()).toBe("audiotrack");
  });

  it("続けて 2 回クリックしたときだけ activate する", async () => {
    const wrapper = factory();
    await wrapper.trigger("click");
    expect(wrapper.emitted("activate")).toBeUndefined();
    await wrapper.trigger("click");
    expect(wrapper.emitted("activate")).toHaveLength(1);
  });

  it("間隔が空いた 2 回のクリックでは activate しない", async () => {
    const wrapper = factory();
    await wrapper.trigger("click");
    vi.advanceTimersByTime(1000);
    await wrapper.trigger("click");
    expect(wrapper.emitted("activate")).toBeUndefined();
  });

  it("行末のボタンは action を emit し、行のクリックには数えない", async () => {
    const wrapper = factory();
    await wrapper.get(".cell-ctrl").trigger("click");
    await wrapper.get(".cell-ctrl").trigger("click");
    expect(wrapper.emitted("action")).toHaveLength(2);
    expect(wrapper.emitted("activate")).toBeUndefined();
  });

  it("再生中の行を強調し、ボタンを無効にできる", () => {
    const wrapper = factory({ playing: true, actionDisabled: true });
    expect(wrapper.classes()).toContain("playing");
    expect(wrapper.get(".cell-ctrl").attributes("disabled")).toBeDefined();
  });
});
