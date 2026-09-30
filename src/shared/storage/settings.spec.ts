import { beforeEach, describe, expect, it } from "vitest";
import { SETTINGS_STORAGE_KEY, loadSettings, patchSettings } from "./settings";

describe("settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存がなければ空", () => {
    expect(loadSettings()).toEqual({});
  });

  it("項目を更新しても他の項目は残る", () => {
    expect(patchSettings({ view: "drive" })).toBe(true);
    patchSettings({ playMode: 1 });
    expect(loadSettings()).toEqual({ version: 1, view: "drive", playMode: 1 });
  });

  it("壊れたデータは空として扱う", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "[1]");
    expect(loadSettings()).toEqual({});
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{");
    expect(loadSettings()).toEqual({});
  });
});
