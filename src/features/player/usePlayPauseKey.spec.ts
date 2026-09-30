import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useToast } from "@/shared/ui/useToast";
import { usePlayPauseKey } from "./usePlayPauseKey";

function setup(result: "play" | "pause" | null = "play") {
  const player = { toggle: vi.fn(() => result) };
  const wrapper = mount(
    defineComponent({
      setup() {
        usePlayPauseKey(player);
        return () => null;
      },
    }),
  );
  return { player, wrapper };
}

function press(target: Element | Document, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: " ",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe("usePlayPauseKey", () => {
  beforeEach(() => {
    useToast().clear();
    document.body.innerHTML = "";
  });

  it("Space で切り替えて、したことをトーストで知らせる", () => {
    const { player, wrapper } = setup("pause");
    const event = press(document.body);
    expect(player.toggle).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(useToast().toasts.value.map((t) => t.text)).toEqual(["pause"]);
    wrapper.unmount();
  });

  it("入力欄・ボタンにフォーカスがあるときは無視する", () => {
    const { player, wrapper } = setup();
    for (const tag of ["input", "textarea", "button", "select"]) {
      const element = document.createElement(tag);
      document.body.append(element);
      press(element);
    }
    expect(player.toggle).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("IME 変換中・修飾キーつき・別のキーは無視する", () => {
    const { player, wrapper } = setup();
    press(document.body, { isComposing: true });
    press(document.body, { ctrlKey: true });
    press(document.body, { metaKey: true });
    press(document.body, { key: "a" });
    expect(player.toggle).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("曲がなくて何も起きないときは、スクロールも止めない", () => {
    const { wrapper } = setup(null);
    const event = press(document.body);
    expect(event.defaultPrevented).toBe(false);
    expect(useToast().toasts.value).toHaveLength(0);
    wrapper.unmount();
  });

  it("画面を離れたら、キー操作を外す", () => {
    const { player, wrapper } = setup();
    wrapper.unmount();
    press(document.body);
    expect(player.toggle).not.toHaveBeenCalled();
  });
});
