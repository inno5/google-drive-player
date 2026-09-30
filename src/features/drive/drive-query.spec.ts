import { describe, expect, it } from "vitest";
import {
  childrenQuery,
  escapeQueryValue,
  folderQuery,
  searchQuery,
} from "./drive-query";

const TARGET =
  "(mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'audio/') and trashed = false";

describe("drive-query", () => {
  it("\\ を先に、次に ' をエスケープする", () => {
    expect(escapeQueryValue("a'b")).toBe("a\\'b");
    expect(escapeQueryValue("a\\b")).toBe("a\\\\b");
    expect(escapeQueryValue("\\'")).toBe("\\\\\\'");
  });

  it("フォルダ直下の q", () => {
    expect(folderQuery("root")).toBe(`${TARGET} and 'root' in parents`);
  });

  it("検索の q（特殊文字を含む語）", () => {
    expect(searchQuery("it's")).toBe(`${TARGET} and name contains 'it\\'s'`);
  });

  it("複数フォルダ直下の q", () => {
    expect(childrenQuery(["a", "b"])).toBe(
      `${TARGET} and ('a' in parents or 'b' in parents)`,
    );
  });
});
