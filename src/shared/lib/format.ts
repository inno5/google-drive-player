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
