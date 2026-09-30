import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import StepControl from "./StepControl.vue";

describe("StepControl", () => {
  it("ラベルと現在値を表示する", () => {
    const wrapper = mount(StepControl, {
      props: { label: "ピッチ", display: "+2", resetLabel: "0" },
    });
    expect(wrapper.text()).toContain("ピッチ");
    expect(wrapper.get("[data-testid=value]").text()).toBe("+2");
  });

  it("真ん中のボタンには元の値を出し、押すとリセットする", async () => {
    const wrapper = mount(StepControl, {
      props: { label: "速度", display: "×0.5", resetLabel: "×1" },
    });
    const reset = wrapper.get("[aria-label=速度を元に戻す]");
    expect(reset.text()).toBe("×1");
    await reset.trigger("click");
    expect(wrapper.emitted("reset")).toHaveLength(1);
  });

  it("−・＋・リセットの操作を通知する", async () => {
    const wrapper = mount(StepControl, {
      props: { label: "速度", display: "×1", resetLabel: "×1" },
    });
    await wrapper.get("[aria-label=速度を下げる]").trigger("click");
    await wrapper.get("[aria-label=速度を上げる]").trigger("click");
    await wrapper.get("[aria-label=速度を元に戻す]").trigger("click");
    expect(wrapper.emitted("decrease")).toHaveLength(1);
    expect(wrapper.emitted("increase")).toHaveLength(1);
    expect(wrapper.emitted("reset")).toHaveLength(1);
  });

  it("動かせないボタンは押せない", () => {
    const wrapper = mount(StepControl, {
      props: {
        label: "ピッチ",
        display: "0",
        resetLabel: "0",
        canDecrease: false,
        canIncrease: false,
        canReset: false,
      },
    });
    for (const button of wrapper.findAll("button")) {
      expect(button.attributes("disabled")).toBe("");
    }
  });
});
