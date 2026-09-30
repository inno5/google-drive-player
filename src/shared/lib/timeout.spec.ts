import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTimeout } from "./timeout";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("時間内に終われば結果を返す", async () => {
    await expect(withTimeout(Promise.resolve(1), 100, "t")).resolves.toBe(1);
  });

  it("時間を過ぎたらメッセージ付きで reject する", async () => {
    const result = withTimeout(new Promise<never>(() => undefined), 100, "t");
    // 先に reject を捕まえておく（タイマーを進める前に await すると永久に待つ）
    const caught = result.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    const error = await caught;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("t");
  });

  it("元の promise の reject はそのまま返す", async () => {
    await expect(
      withTimeout(Promise.reject(new Error("x")), 100, "t"),
    ).rejects.toThrow("x");
  });
});
