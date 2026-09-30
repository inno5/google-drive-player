import { describe, expect, it } from "vitest";
import type { DriveItem } from "@/features/drive";
import { createGetItems } from "./play-sources";

function item(id: string, mimeType = "audio/mpeg"): DriveItem {
  return { id, name: id, mimeType, size: null, modifiedTime: "", parents: [] };
}

describe("createGetItems", () => {
  it("再生元ごとに今の一覧を返し、フォルダは除く", () => {
    let drive = [item("d1"), item("dir", "application/vnd.google-apps.folder")];
    const playlist = [item("p1"), item("p2")];
    const getItems = createGetItems({
      drive: () => drive,
      playlist: () => playlist,
    });

    expect(getItems("drive").map((i) => i.id)).toEqual(["d1"]);
    expect(getItems("playlist").map((i) => i.id)).toEqual(["p1", "p2"]);

    // 一覧が変わったら、次に呼んだときに反映される
    drive = [item("d2"), item("d1")];
    expect(getItems("drive").map((i) => i.id)).toEqual(["d2", "d1"]);
  });
});
