import { describe, expect, it } from "vitest";
import { formatBytes, formatTime } from "./format";

describe("formatBytes", () => {
  it("単位を切り替えて整形する", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(1000)).toBe("1 kB");
    expect(formatBytes(1234567)).toBe("1.23 MB");
    expect(formatBytes(5_000_000_000)).toBe("5 GB");
  });

  it("不明・不正な値は -", () => {
    expect(formatBytes(null)).toBe("-");
    expect(formatBytes(undefined)).toBe("-");
    expect(formatBytes(Number.NaN)).toBe("-");
    expect(formatBytes(-1)).toBe("-");
  });
});

describe("formatTime", () => {
  it("mm:ss、1 時間以上は h:mm:ss", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(5.9)).toBe("00:05");
    expect(formatTime(225)).toBe("03:45");
    expect(formatTime(3600)).toBe("1:00:00");
    expect(formatTime(3725)).toBe("1:02:05");
  });

  it("不正な値は 00:00", () => {
    expect(formatTime(Number.NaN)).toBe("00:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("00:00");
    expect(formatTime(-3)).toBe("00:00");
  });
});
