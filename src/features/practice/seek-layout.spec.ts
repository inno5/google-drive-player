import { describe, expect, it } from "vitest";
import {
  ROWS,
  pointToSeconds,
  pointerToSeconds,
  nextPosition,
  prevPosition,
  rowStarts,
  secondsToPoint,
} from "./seek-layout";

describe("seek-layout", () => {
  it("曲を 10 等分した各段の開始時刻を返す", () => {
    expect(rowStarts(180)).toEqual([0, 18, 36, 54, 72, 90, 108, 126, 144, 162]);
    expect(rowStarts(0)).toEqual(Array(ROWS).fill(0));
  });

  it("秒を、段と段の中の位置に直す", () => {
    expect(secondsToPoint(0, 100)).toEqual({ row: 0, ratio: 0 });
    expect(secondsToPoint(25, 100)).toEqual({ row: 2, ratio: 0.5 });
    expect(secondsToPoint(10, 100)).toEqual({ row: 1, ratio: 0 });
  });

  it("曲の最後は最終段の右端になり、範囲外は端に丸める", () => {
    expect(secondsToPoint(100, 100)).toEqual({ row: 9, ratio: 1 });
    expect(secondsToPoint(150, 100)).toEqual({ row: 9, ratio: 1 });
    expect(secondsToPoint(-5, 100)).toEqual({ row: 0, ratio: 0 });
    expect(secondsToPoint(5, 0)).toEqual({ row: 0, ratio: 0 });
  });

  it("段と位置を秒に直す（範囲外は丸める）", () => {
    expect(pointToSeconds(2, 0.5, 100)).toBe(25);
    expect(pointToSeconds(9, 1, 100)).toBe(100);
    expect(pointToSeconds(-1, -1, 100)).toBe(0);
    expect(pointToSeconds(20, 5, 100)).toBe(100);
    expect(pointToSeconds(1, 0.5, 0)).toBe(0);
  });

  it("バー内の座標から秒を求める。範囲外へ出ても端に丸める", () => {
    // 幅 200・高さ 100（1 段 10px）、曲は 100 秒（1 段 10 秒）
    expect(pointerToSeconds(100, 25, 200, 100, 100)).toBe(25);
    expect(pointerToSeconds(-30, 5, 200, 100, 100)).toBe(0);
    expect(pointerToSeconds(999, 95, 200, 100, 100)).toBe(100);
    expect(pointerToSeconds(100, -50, 200, 100, 100)).toBe(5);
    expect(pointerToSeconds(100, 500, 200, 100, 100)).toBe(95);
    expect(pointerToSeconds(10, 10, 0, 0, 100)).toBe(0);
  });
});

describe("prevPosition", () => {
  it("マーカーより後ろ（1 秒を超えて進んでいる）なら、マーカーへ戻る", () => {
    expect(prevPosition(30, 20)).toBe(20);
    expect(prevPosition(21.5, 20)).toBe(20);
  });

  it("マーカーから 1 秒以内なら、曲の先頭へ戻る", () => {
    expect(prevPosition(21, 20)).toBe(0);
    expect(prevPosition(20, 20)).toBe(0);
  });

  it("マーカーより前、またはマーカーがなければ、曲の先頭へ戻る", () => {
    expect(prevPosition(10, 20)).toBe(0);
    expect(prevPosition(50, null)).toBe(0);
  });
});

describe("nextPosition", () => {
  it("再生位置がマーカーより前なら、マーカーへ進む", () => {
    expect(nextPosition(10, 20)).toBe(20);
    expect(nextPosition(0, 20)).toBe(20);
  });

  it("マーカー以降、またはマーカーがなければ、何もしない", () => {
    expect(nextPosition(20, 20)).toBeNull();
    expect(nextPosition(30, 20)).toBeNull();
    expect(nextPosition(10, null)).toBeNull();
  });
});
