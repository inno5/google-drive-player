import { describe, expect, it } from "vitest";
import { OVERVIEW_BUCKETS, computeOverview, resamplePeaks } from "./waveform";

describe("computeOverview", () => {
  it("10 段に分けて、段ごとの最小・最大を集計する", () => {
    // 1 段 = 4800 サンプル（区切り 1 つ = 2 サンプル）。段 3 にだけ音がある
    const length = 48000;
    const samples = new Float32Array(length);
    samples[3 * 4800 + 10] = 0.5;
    samples[3 * 4800 + 11] = -0.25;
    const overview = computeOverview([samples]);
    expect(overview).toHaveLength(10);
    expect(Math.max(...overview[3]!.max)).toBe(0.5);
    expect(Math.min(...overview[3]!.min)).toBe(-0.25);
    expect(Math.max(...overview[2]!.max)).toBe(0);
    expect(overview[0]!.min).toHaveLength(OVERVIEW_BUCKETS);
  });

  it("ステレオは左右を平均する", () => {
    const left = new Float32Array(48000).fill(1);
    const right = new Float32Array(48000).fill(0);
    const overview = computeOverview([left, right]);
    expect(overview[0]!.max[0]).toBe(0.5);
    expect(overview[9]!.min[100]).toBe(0.5);
  });

  it("空の曲でも落ちない", () => {
    const overview = computeOverview([]);
    expect(overview).toHaveLength(10);
    expect(overview[0]!.max[0]).toBe(0);
  });

  it("短すぎる曲（区切りより少ないサンプル）でも落ちない", () => {
    const overview = computeOverview([new Float32Array([0.1, -0.1, 0.3])]);
    expect(overview).toHaveLength(10);
    expect(Number.isFinite(overview[0]!.max[0])).toBe(true);
  });
});

describe("resamplePeaks", () => {
  it("列数を減らすと、まとめた区間の最小・最大になる", () => {
    const min = Float32Array.from([-1, 0, 0, 0]);
    const max = Float32Array.from([0, 0, 0.5, 0]);
    const [row] = resamplePeaks([{ min, max }], 2);
    expect(Array.from(row!.min)).toEqual([-1, 0]);
    expect(Array.from(row!.max)).toEqual([0, 0.5]);
  });

  it("列数を増やすと、同じ値を引き伸ばす", () => {
    const min = Float32Array.from([-1, -0.5]);
    const max = Float32Array.from([1, 0.5]);
    const [row] = resamplePeaks([{ min, max }], 4);
    expect(Array.from(row!.max)).toEqual([1, 1, 0.5, 0.5]);
  });
});
