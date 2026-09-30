/** ダブルクリック・ダブルタップとみなす間隔（ms） */
export const DOUBLE_CLICK_MS = 350;

export type ClickKind = "single" | "double";

/**
 * クリックがシングルかダブルかを判定する関数を作る。
 * dblclick イベントはタッチ端末で安定しないため、click の間隔で判定する。
 * 2 回目が間隔内なら "double"（そのあとの 1 回目は数え直し）、それ以外は "single"。
 */
export function createClickCounter(
  intervalMs: number = DOUBLE_CLICK_MS,
): (now?: number) => ClickKind {
  let last: number | null = null;
  return (now = Date.now()) => {
    if (last !== null && now - last <= intervalMs) {
      last = null;
      return "double";
    }
    last = now;
    return "single";
  };
}
