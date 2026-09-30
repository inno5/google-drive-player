import { ROWS } from "./seek-layout";

/** 各段の、細かさの基準にする区切りの数。これ以上広い画面では、同じ値を引き伸ばす */
export const OVERVIEW_BUCKETS = 2400;

/** 1 段ぶんの波形（区切りごとの最小・最大。-1〜1） */
export interface RowPeaks {
  min: Float32Array;
  max: Float32Array;
}

/**
 * 曲全体を 10 段に分け、各段を OVERVIEW_BUCKETS 個に区切って、区切りごとの最小・最大を集計する。
 * ステレオは左右を平均して（モノラルにして）から集計する。曲を 1 回なぞるだけで済ませ、
 * 画面の幅が変わったときは、この結果を resamplePeaks で作り直す。
 */
export function computeOverview(channels: Float32Array[]): RowPeaks[] {
  const left = channels[0];
  const right = channels[1];
  const length = left?.length ?? 0;
  return Array.from({ length: ROWS }, (_, row) => {
    const min = new Float32Array(OVERVIEW_BUCKETS);
    const max = new Float32Array(OVERVIEW_BUCKETS);
    if (!left || length === 0) {
      return { min, max };
    }
    const rowStart = (row * length) / ROWS;
    const rowEnd = ((row + 1) * length) / ROWS;
    const bucketLength = (rowEnd - rowStart) / OVERVIEW_BUCKETS;
    for (let b = 0; b < OVERVIEW_BUCKETS; b++) {
      const start = Math.min(
        Math.floor(rowStart + b * bucketLength),
        length - 1,
      );
      const end = Math.min(
        Math.max(Math.floor(rowStart + (b + 1) * bucketLength), start + 1),
        length,
      );
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = start; i < end; i++) {
        const value = right
          ? ((left[i] ?? 0) + (right[i] ?? 0)) / 2
          : (left[i] ?? 0);
        if (value < lo) {
          lo = value;
        }
        if (value > hi) {
          hi = value;
        }
      }
      min[b] = lo;
      max[b] = hi;
    }
    return { min, max };
  });
}

/** 集計済みの波形を、指定した列数（画面の幅）に作り直す */
export function resamplePeaks(
  overview: RowPeaks[],
  columns: number,
): RowPeaks[] {
  const count = Math.max(Math.floor(columns), 1);
  return overview.map((row) => {
    const min = new Float32Array(count);
    const max = new Float32Array(count);
    const source = row.min.length;
    for (let c = 0; c < count; c++) {
      const start = Math.min(Math.floor((c * source) / count), source - 1);
      const end = Math.min(
        Math.max(Math.floor(((c + 1) * source) / count), start + 1),
        source,
      );
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = start; i < end; i++) {
        lo = Math.min(lo, row.min[i] ?? 0);
        hi = Math.max(hi, row.max[i] ?? 0);
      }
      min[c] = lo;
      max[c] = hi;
    }
    return { min, max };
  });
}
