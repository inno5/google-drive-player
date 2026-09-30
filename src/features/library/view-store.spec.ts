import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { SETTINGS_STORAGE_KEY, loadSettings } from "@/shared/storage/settings";
import { nextView, useViewStore } from "./view-store";

describe("nextView", () => {
  it("押したタブだけが表示中なら両方表示に戻り、それ以外ならそのタブだけにする", () => {
    expect(nextView("both", "drive")).toBe("drive");
    expect(nextView("both", "playlist")).toBe("playlist");
    expect(nextView("drive", "drive")).toBe("both");
    expect(nextView("drive", "playlist")).toBe("playlist");
    expect(nextView("playlist", "playlist")).toBe("both");
    expect(nextView("playlist", "drive")).toBe("drive");
  });
});

describe("view store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("初期値は both", () => {
    expect(useViewStore().view).toBe("both");
  });

  it("切り替えを保存し、次回に復元する", () => {
    const store = useViewStore();
    store.select("playlist");
    expect(store.view).toBe("playlist");
    expect(loadSettings().view).toBe("playlist");

    setActivePinia(createPinia());
    expect(useViewStore().view).toBe("playlist");
  });

  it("他の設定を消さない。壊れた値は both にする", () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, view: "nope", playMode: 2 }),
    );
    const store = useViewStore();
    expect(store.view).toBe("both");
    store.select("drive");
    expect(loadSettings()).toMatchObject({ view: "drive", playMode: 2 });
  });
});
