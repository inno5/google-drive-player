const UNITS = ["B", "kB", "MB", "GB", "TB"] as const;

/** ファイルサイズを 1000 進数で整形する（例: 1234567 → "1.23 MB"）。不明なら "-" */
export function formatBytes(size: number | null | undefined): string {
  if (
    size === null ||
    size === undefined ||
    !Number.isFinite(size) ||
    size < 0
  ) {
    return "-";
  }
  if (size < 1) {
    return `${size} B`;
  }
  const exponent = Math.min(Math.floor(Math.log10(size) / 3), UNITS.length - 1);
  const value = Number((size / 1000 ** exponent).toFixed(2));
  return `${value} ${UNITS[exponent]}`;
}

/** 再生時間（秒）を "mm:ss"、1 時間以上は "h:mm:ss" に整形する。不正な値は "00:00" */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
