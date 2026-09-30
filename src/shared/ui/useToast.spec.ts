import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToast } from "./useToast";

describe("useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToast().clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("表示して、一定時間後に消える", () => {
    const { toasts, show } = useToast();
    show("hello");
    expect(toasts.value.map((t) => t.text)).toEqual(["hello"]);
    expect(toasts.value[0]?.type).toBe("info");
    vi.advanceTimersByTime(2200);
    expect(toasts.value).toHaveLength(0);
  });

  it("エラーは長めに表示する", () => {
    const { toasts, show } = useToast();
    show("bad", { type: "error" });
    vi.advanceTimersByTime(2200);
    expect(toasts.value).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    expect(toasts.value).toHaveLength(0);
  });

  it("複数を同時に表示し、dismiss で個別に消せる", () => {
    const { toasts, show, dismiss } = useToast();
    show("a");
    show("b");
    expect(toasts.value).toHaveLength(2);
    dismiss(toasts.value[0]?.id ?? -1);
    expect(toasts.value.map((t) => t.text)).toEqual(["b"]);
  });
});
