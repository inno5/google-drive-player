import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SeekBar from "./SeekBar.vue";

/** 幅 200・高さ 100 のバー（1 段 10px）。曲は 100 秒（1 段 10 秒） */
function setup(props: Partial<InstanceType<typeof SeekBar>["$props"]> = {}) {
  const wrapper = mount(SeekBar, {
    props: { duration: 100, position: 0, overview: null, ...props },
    attachTo: document.body,
  });
  wrapper.element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
  return wrapper;
}

function pointer(
  wrapper: ReturnType<typeof setup>,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  x: number,
  y: number,
) {
  const event = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
  });
  wrapper.element.dispatchEvent(event);
}

describe("SeekBar", () => {
  it("10 段ぶんの開始時刻のラベルを出す", () => {
    const wrapper = setup({ duration: 180 });
    const labels = wrapper.findAll(".label").map((l) => l.text());
    expect(labels).toEqual([
      "00:00",
      "00:18",
      "00:36",
      "00:54",
      "01:12",
      "01:30",
      "01:48",
      "02:06",
      "02:24",
      "02:42",
    ]);
  });

  it("再生位置の線を、該当する段の位置に置く", () => {
    const wrapper = setup({ position: 25 });
    const head = wrapper.find<HTMLElement>(".head").element;
    expect(head.style.top).toBe("20%");
    expect(head.style.left).toBe("50%");
  });

  it("タップでその位置へ seek する", () => {
    const wrapper = setup();
    pointer(wrapper, "pointerdown", 100, 25);
    pointer(wrapper, "pointerup", 100, 25);
    expect(wrapper.emitted("seek")).toEqual([[25]]);
    expect(wrapper.emitted("scrubStart")).toBeUndefined();
  });

  it("少しの手ぶれはタップとして扱う", () => {
    const wrapper = setup();
    pointer(wrapper, "pointerdown", 100, 25);
    pointer(wrapper, "pointermove", 103, 26);
    pointer(wrapper, "pointerup", 103, 26);
    expect(wrapper.emitted("scrubStart")).toBeUndefined();
    expect(wrapper.emitted("seek")).toHaveLength(1);
  });

  it("ドラッグは scrub を送り、離した位置で scrubEnd する（seek は送らない）", () => {
    const wrapper = setup();
    pointer(wrapper, "pointerdown", 20, 5);
    pointer(wrapper, "pointermove", 100, 5);
    pointer(wrapper, "pointermove", 100, 45);
    pointer(wrapper, "pointerup", 200, 45);
    expect(wrapper.emitted("scrubStart")).toHaveLength(1);
    expect(wrapper.emitted("scrub")).toEqual([[5], [45]]);
    expect(wrapper.emitted("scrubEnd")).toEqual([[50]]);
    expect(wrapper.emitted("seek")).toBeUndefined();
  });

  it("バーの外へ出しても端の位置に丸める", () => {
    const wrapper = setup();
    pointer(wrapper, "pointerdown", 100, 50);
    pointer(wrapper, "pointermove", -100, -100);
    pointer(wrapper, "pointerup", 999, 999);
    expect(wrapper.emitted("scrub")).toEqual([[0]]);
    expect(wrapper.emitted("scrubEnd")).toEqual([[100]]);
  });

  it("曲の長さが 0 のときは操作を受け付けない", () => {
    const wrapper = setup({ duration: 0 });
    pointer(wrapper, "pointerdown", 100, 25);
    pointer(wrapper, "pointerup", 100, 25);
    expect(wrapper.emitted("seek")).toBeUndefined();
  });

  it("ドラッグが中断されたら、最後の位置で scrubEnd する", () => {
    const wrapper = setup();
    pointer(wrapper, "pointerdown", 20, 5);
    pointer(wrapper, "pointermove", 100, 5);
    pointer(wrapper, "pointercancel", 100, 5);
    expect(wrapper.emitted("scrubEnd")).toEqual([[5]]);
  });
});
