export const PITCH_MIN = -12;
export const PITCH_MAX = 12;
export const SPEED_MIN = 0.25;
export const SPEED_MAX = 2;
export const SPEED_STEP = 0.25;
/** 曲の長さの上限（秒） */
export const MAX_DURATION_SECONDS = 15 * 60;

/** ピッチ（半音）を整数にして、範囲内に収める */
export function clampPitch(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(Math.round(value), PITCH_MIN), PITCH_MAX);
}

/** 速度（倍）を 0.25 刻みにして、範囲内に収める */
export function clampSpeed(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  const stepped = Math.round(value / SPEED_STEP) * SPEED_STEP;
  return Math.min(Math.max(Number(stepped.toFixed(2)), SPEED_MIN), SPEED_MAX);
}

/** ピッチの表示（+2 / -3 / 0） */
export function formatPitch(pitch: number): string {
  return pitch > 0 ? `+${pitch}` : String(pitch);
}

/** 速度の表示（×0.75） */
export function formatSpeed(speed: number): string {
  return `×${Number(speed.toFixed(2))}`;
}
