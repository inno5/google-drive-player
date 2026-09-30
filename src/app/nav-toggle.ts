import type { RouteLocationRaw } from "vue-router";

/** ヘッダーのトグルボタンで切り替える画面 */
export type ToggleTarget = "practice" | "debug";

/** メインビューのルート名 */
const MAIN_VIEWS: ReadonlySet<string> = new Set(["home", "folder", "search"]);

export function isMainView(name: unknown): boolean {
  return typeof name === "string" && MAIN_VIEWS.has(name);
}

/**
 * 練習・デバッグのボタンを押したときの移動先を決める。
 * - 今その画面なら、直前のメインビュー（なければ home）へ戻る。
 * - それ以外（メインビュー・もう一方の画面）からは、その画面へ移る。
 * @param lastMainPath 直前に開いていたメインビューの fullPath
 */
export function resolveToggle(
  currentName: unknown,
  target: ToggleTarget,
  lastMainPath: string | null,
): RouteLocationRaw {
  if (currentName === target) {
    return lastMainPath ?? { name: "home" };
  }
  return { name: target };
}
