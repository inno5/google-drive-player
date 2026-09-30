import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PitchDialog from "./PitchDialog.vue";
import SpeedDialog from "./SpeedDialog.vue";

describe("PitchDialog", () => {
  it("閉じているときは何も出さない", () => {
    const wrapper = mount(PitchDialog, { props: { open: false, pitch: 0 } });
    expect(wrapper.find("[role=dialog]").exists()).toBe(false);
  });

  it("現在のキーを +2 / -3 / 0 の形で表示する", async () => {
    const wrapper = mount(PitchDialog, { props: { open: true, pitch: 2 } });
    expect(wrapper.get("[data-testid=pitch-value]").text()).toBe("+2");
    await wrapper.setProps({ pitch: -3 });
    expect(wrapper.get("[data-testid=pitch-value]").text()).toBe("-3");
    await wrapper.setProps({ pitch: 0 });
    expect(wrapper.get("[data-testid=pitch-value]").text()).toBe("0");
  });

  it("プラス・マイナス・リセットの操作を通知する", async () => {
    const wrapper = mount(PitchDialog, { props: { open: true, pitch: 2 } });
    await wrapper.get("[aria-label=半音上げる]").trigger("click");
    await wrapper.get("[aria-label=半音下げる]").trigger("click");
    await wrapper.get(".reset").trigger("click");
    expect(wrapper.emitted("change")).toEqual([[3], [1], [0]]);
  });

  it("範囲の端では、それ以上動かせない", () => {
    const top = mount(PitchDialog, { props: { open: true, pitch: 12 } });
    expect(top.get("[aria-label=半音上げる]").attributes("disabled")).toBe("");
    const bottom = mount(PitchDialog, { props: { open: true, pitch: -12 } });
    expect(bottom.get("[aria-label=半音下げる]").attributes("disabled")).toBe(
      "",
    );
  });

  it("原曲のときは、リセットを押せない", () => {
    const wrapper = mount(PitchDialog, { props: { open: true, pitch: 0 } });
    expect(wrapper.get(".reset").attributes("disabled")).toBe("");
  });

  it("背景をタップ・閉じるボタン・Esc で閉じる", async () => {
    const wrapper = mount(PitchDialog, { props: { open: true, pitch: 0 } });
    await wrapper.get(".backdrop").trigger("click");
    await wrapper.get("[aria-label=閉じる]").trigger("click");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(wrapper.emitted("close")).toHaveLength(3);
  });
});

describe("SpeedDialog", () => {
  it("現在の速度を ×0.75 の形で表示する", () => {
    const wrapper = mount(SpeedDialog, { props: { open: true, speed: 0.75 } });
    expect(wrapper.get("[data-testid=speed-value]").text()).toBe("×0.75");
  });

  it("スライダーの値を通知する（0.25〜2、0.05 刻み）", async () => {
    const wrapper = mount(SpeedDialog, { props: { open: true, speed: 1 } });
    const slider = wrapper.get<HTMLInputElement>("input[type=range]");
    expect(slider.attributes("min")).toBe("0.25");
    expect(slider.attributes("max")).toBe("2");
    expect(slider.attributes("step")).toBe("0.05");
    await slider.setValue("0.6");
    expect(wrapper.emitted("change")).toEqual([[0.6]]);
  });

  it("即設定ボタンで 7 つの倍率を選べ、現在の値を強調する", async () => {
    const wrapper = mount(SpeedDialog, { props: { open: true, speed: 0.5 } });
    const presets = wrapper.findAll(".preset");
    expect(presets.map((p) => p.text())).toEqual([
      "0.25",
      "0.5",
      "0.75",
      "1",
      "1.25",
      "1.5",
      "2",
    ]);
    expect(wrapper.get(".preset.active").text()).toBe("0.5");
    await presets[2]!.trigger("click");
    expect(wrapper.emitted("change")).toEqual([[0.75]]);
  });
});
