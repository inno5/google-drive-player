import { beforeEach, describe, expect, it } from "vitest";
import { inspectStorage } from "./storage-inspect";

describe("inspectStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("キー順に並べ、長い値は先頭 80 文字にする", () => {
    localStorage.setItem("b", "x".repeat(200));
    localStorage.setItem("a", "1");
    const entries = inspectStorage();
    expect(entries.map((e) => e.key)).toEqual(["a", "b"]);
    expect(entries[1]?.length).toBe(200);
    expect(entries[1]?.preview).toHaveLength(80);
  });

  it("hidden のキーは値を出さない", () => {
    localStorage.setItem("secret", "token");
    const [entry] = inspectStorage(["secret"]);
    expect(entry).toMatchObject({ hidden: true, preview: "", length: 5 });
  });
});
