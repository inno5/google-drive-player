/** シークバーの段数（固定） */
export const ROWS = 10;

/** 1 段が表す長さ（秒） */
export function rowSeconds(duration: number): number {
  return duration > 0 ? duration / ROWS : 0;
}

/** 各段の開始時刻（秒） */
export function rowStarts(duration: number): number[] {
  const step = rowSeconds(duration);
  return Array.from({ length: ROWS }, (_, row) => row * step);
}

/** 曲の中の位置（秒）を、段番号と段の中の位置（0〜1）に直す。範囲外は端に丸める */
export function secondsToPoint(
  seconds: number,
  duration: number,
): { row: number; ratio: number } {
  if (!(duration > 0)) {
    return { row: 0, ratio: 0 };
  }
  const clamped = Math.min(Math.max(seconds, 0), duration);
  const scaled = (clamped / duration) * ROWS;
  // 曲の最後は、最終段の右端として扱う
  const row = Math.min(Math.floor(scaled), ROWS - 1);
  return { row, ratio: scaled - row };
}

/** 段番号と段の中の位置（0〜1）を、曲の中の位置（秒）に直す。範囲外は端に丸める */
export function pointToSeconds(
  row: number,
  ratio: number,
  duration: number,
): number {
  if (!(duration > 0)) {
    return 0;
  }
  const r = Math.min(Math.max(Math.trunc(row), 0), ROWS - 1);
  const x = Math.min(Math.max(ratio, 0), 1);
  return Math.min(((r + x) / ROWS) * duration, duration);
}

/**
 * バー全体の中の座標（左上が原点）から、曲の中の位置（秒）を求める。
 * ドラッグで範囲外へ出ても、端の位置に丸める。
 */
export function pointerToSeconds(
  x: number,
  y: number,
  width: number,
  height: number,
  duration: number,
): number {
  if (!(width > 0) || !(height > 0)) {
    return 0;
  }
  const rowHeight = height / ROWS;
  const row = Math.min(Math.max(Math.floor(y / rowHeight), 0), ROWS - 1);
  return pointToSeconds(row, x / width, duration);
}
