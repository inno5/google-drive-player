import type { RouteLocationRaw } from "vue-router";

/** ヘッダーのボタンで開く画面 */
export type NavTarget = "main" | "practice" | "debug";

/** メインビューのルート名 */
const MAIN_VIEWS: ReadonlySet<string> = new Set(["home", "folder", "search"]);

export function isMainView(name: unknown): boolean {
  return typeof name === "string" && MAIN_VIEWS.has(name);
}

/**
 * ヘッダーのボタンを押したときの移動先。
 * メインは、直前に開いていたメインビュー（フォルダや検索語を含む。なければ home）を開く。
 * @param lastMainPath 直前に開いていたメインビューの fullPath
 */
export function resolveNav(
  target: NavTarget,
  lastMainPath: string | null,
): RouteLocationRaw {
  if (target === "main") {
    return lastMainPath ?? { name: "home" };
  }
  return { name: target };
}
