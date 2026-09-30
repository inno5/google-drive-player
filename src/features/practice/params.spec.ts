import { describe, expect, it } from "vitest";
import { clampPitch, clampSpeed, formatPitch, formatSpeed } from "./params";

describe("params", () => {
  it("ピッチは整数で ±12 に収める", () => {
    expect(clampPitch(3)).toBe(3);
    expect(clampPitch(2.6)).toBe(3);
    expect(clampPitch(13)).toBe(12);
    expect(clampPitch(-99)).toBe(-12);
    expect(clampPitch(Number.NaN)).toBe(0);
  });

  it("速度は 0.25 刻みで 0.25〜2 に収める", () => {
    expect(clampSpeed(0.75)).toBe(0.75);
    expect(clampSpeed(0.9)).toBe(1);
    expect(clampSpeed(0.1)).toBe(0.25);
    expect(clampSpeed(3)).toBe(2);
    expect(clampSpeed(Number.NaN)).toBe(1);
  });

  it("表示用に整形する", () => {
    expect(formatPitch(2)).toBe("+2");
    expect(formatPitch(-3)).toBe("-3");
    expect(formatPitch(0)).toBe("0");
    expect(formatSpeed(0.75)).toBe("×0.75");
    expect(formatSpeed(1)).toBe("×1");
  });
});
