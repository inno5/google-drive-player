import { beforeEach, describe, expect, it } from "vitest";
import { TAGS_STORAGE_KEY, loadTags, saveTags } from "./tag-storage";

const tags = {
  s1: {
    modifiedTime: "2024-01-01T00:00:00.000Z",
    artist: "A",
    title: "T",
    album: "Al",
    track: "1",
  },
};

describe("tag-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存したタグを読み戻せる", () => {
    expect(saveTags(tags)).toBe(true);
    expect(loadTags()).toEqual(tags);
  });

  it("gdp:tags に { version: 1, tags } の形で保存する", () => {
    saveTags(tags);
    expect(JSON.parse(localStorage.getItem(TAGS_STORAGE_KEY) ?? "")).toEqual({
      version: 1,
      tags,
    });
  });

  it("未保存・壊れたデータ・古い形式は空にする", () => {
    expect(loadTags()).toEqual({});
    localStorage.setItem(TAGS_STORAGE_KEY, "{broken");
    expect(loadTags()).toEqual({});
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify({ version: 0 }));
    expect(loadTags()).toEqual({});
    localStorage.setItem(
      TAGS_STORAGE_KEY,
      JSON.stringify({ version: 1, tags: [] }),
    );
    expect(loadTags()).toEqual({});
  });

  it("不正な項目は無視し、欠けた文字の項目は空文字にする", () => {
    localStorage.setItem(
      TAGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        tags: {
          ok: { modifiedTime: "m", artist: "A" },
          noTime: { artist: "A" },
          notObject: 1,
          "": { modifiedTime: "m" },
        },
      }),
    );
    expect(loadTags()).toEqual({
      ok: { modifiedTime: "m", artist: "A", title: "", album: "", track: "" },
    });
  });
});
