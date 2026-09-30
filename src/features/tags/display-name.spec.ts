import { describe, expect, it } from "vitest";
import {
  buildDisplayName,
  hasArtistAndTitle,
  isDisplayMode,
  nextDisplayMode,
} from "./display-name";
import type { RawTags } from "./tag-types";

const full: RawTags = {
  artist: "Artist",
  title: "Song",
  album: "Album",
  track: "3",
};

describe("buildDisplayName", () => {
  it("タイトル - アーティスト", () => {
    expect(buildDisplayName("titleArtist", "03 song.mp3", full)).toBe(
      "Song - Artist",
    );
  });

  it("詳細: アーティスト / アルバム [トラック] - タイトル", () => {
    expect(buildDisplayName("full", "03 song.mp3", full)).toBe(
      "Artist / Album [3] - Song",
    );
  });

  it("詳細: アルバムがなければその部分を省く", () => {
    expect(buildDisplayName("full", "a.mp3", { ...full, album: "" })).toBe(
      "Artist [3] - Song",
    );
  });

  it("詳細: トラックがなければ省く。3/12 はそのまま出す", () => {
    expect(buildDisplayName("full", "a.mp3", { ...full, track: "" })).toBe(
      "Artist / Album - Song",
    );
    expect(buildDisplayName("full", "a.mp3", { ...full, track: "3/12" })).toBe(
      "Artist / Album [3/12] - Song",
    );
  });

  it("詳細: アルバムもトラックもなければ アーティスト - タイトル", () => {
    expect(
      buildDisplayName("full", "a.mp3", { ...full, album: "", track: "" }),
    ).toBe("Artist - Song");
  });

  it("ファイル名モードでは、タグがあってもファイル名", () => {
    expect(buildDisplayName("fileName", "03 song.mp3", full)).toBe(
      "03 song.mp3",
    );
  });

  it("アーティストか曲名がなければ、どのモードでもファイル名", () => {
    for (const mode of ["titleArtist", "full"] as const) {
      expect(buildDisplayName(mode, "a.mp3", { ...full, artist: "" })).toBe(
        "a.mp3",
      );
      expect(buildDisplayName(mode, "a.mp3", { ...full, title: "" })).toBe(
        "a.mp3",
      );
    }
  });

  it("タグがなければファイル名", () => {
    expect(buildDisplayName("titleArtist", "a.mp3", undefined)).toBe("a.mp3");
    expect(buildDisplayName("full", "a.mp3", null)).toBe("a.mp3");
  });
});

describe("hasArtistAndTitle", () => {
  it("両方あるときだけ true", () => {
    expect(hasArtistAndTitle(full)).toBe(true);
    expect(hasArtistAndTitle({ artist: "A", title: "" })).toBe(false);
    expect(hasArtistAndTitle({ artist: "", title: "T" })).toBe(false);
    expect(hasArtistAndTitle(undefined)).toBe(false);
  });
});

describe("表示モードの切り替え", () => {
  it("タイトル - アーティスト → 詳細 → ファイル名 → 最初に戻る", () => {
    expect(nextDisplayMode("titleArtist")).toBe("full");
    expect(nextDisplayMode("full")).toBe("fileName");
    expect(nextDisplayMode("fileName")).toBe("titleArtist");
  });

  it("isDisplayMode は 3 つのモードだけを認める", () => {
    expect(isDisplayMode("full")).toBe(true);
    expect(isDisplayMode("other")).toBe(false);
    expect(isDisplayMode(undefined)).toBe(false);
  });
});
