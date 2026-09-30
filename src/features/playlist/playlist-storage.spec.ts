import { beforeEach, describe, expect, it } from "vitest";
import {
  PLAYLIST_STORAGE_KEY,
  loadPlaylist,
  savePlaylist,
  type PlaylistItem,
} from "./playlist-storage";

const item: PlaylistItem = {
  id: "1",
  name: "a.mp3",
  mimeType: "audio/mpeg",
  size: 100,
  modifiedTime: "2026-01-01T00:00:00.000Z",
  parents: ["p"],
};

describe("playlist-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("保存して読み出せる", () => {
    expect(savePlaylist([item])).toBe(true);
    expect(loadPlaylist()).toEqual([item]);
  });

  it("保存がなければ空", () => {
    expect(loadPlaylist()).toEqual([]);
  });

  it("壊れたデータ・古い形式は空として扱う", () => {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, "{");
    expect(loadPlaylist()).toEqual([]);
    localStorage.setItem(PLAYLIST_STORAGE_KEY, "[1,2]");
    expect(loadPlaylist()).toEqual([]);
    localStorage.setItem(
      PLAYLIST_STORAGE_KEY,
      JSON.stringify({ version: 99, items: [item] }),
    );
    expect(loadPlaylist()).toEqual([]);
  });

  it("不正な曲・重複は無視し、足りない項目は補う", () => {
    localStorage.setItem(
      PLAYLIST_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        items: [
          null,
          { id: "", name: "x", mimeType: "audio/mpeg" },
          { id: "2", name: "b", mimeType: "audio/mpeg" },
          { id: "2", name: "dup", mimeType: "audio/mpeg" },
          {
            id: "3",
            name: "c",
            mimeType: "audio/mpeg",
            size: "9",
            parents: [1, "p"],
          },
        ],
      }),
    );
    expect(loadPlaylist()).toEqual([
      {
        id: "2",
        name: "b",
        mimeType: "audio/mpeg",
        size: null,
        modifiedTime: "",
        parents: [],
      },
      {
        id: "3",
        name: "c",
        mimeType: "audio/mpeg",
        size: null,
        modifiedTime: "",
        parents: ["p"],
      },
    ]);
  });
});
