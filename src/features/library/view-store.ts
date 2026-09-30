import { ref } from "vue";
import { defineStore } from "pinia";
import { loadSettings, patchSettings } from "@/shared/storage/settings";

/** 一覧エリアの表示: 左右 2 列 / ドライブだけ / プレイリストだけ */
export type ViewMode = "both" | "drive" | "playlist";
export type ViewTab = "drive" | "playlist";

const VIEW_MODES: readonly ViewMode[] = ["both", "drive", "playlist"];

/**
 * タブを押したときの次の表示。
 * 押したタブだけが表示されていたら両方表示に戻り、それ以外ならそのタブだけにする。
 */
export function nextView(current: ViewMode, clicked: ViewTab): ViewMode {
  return current === clicked ? "both" : clicked;
}

function isViewMode(value: unknown): value is ViewMode {
  return VIEW_MODES.includes(value as ViewMode);
}

export const useViewStore = defineStore("view", () => {
  const saved = loadSettings().view;
  const view = ref<ViewMode>(isViewMode(saved) ? saved : "both");

  function select(tab: ViewTab): void {
    view.value = nextView(view.value, tab);
    patchSettings({ view: view.value });
  }

  return { view, select };
});
