import { describe, expect, it } from "vitest";
import { isMainView, resolveToggle } from "./nav-toggle";

describe("nav-toggle", () => {
  it("メインビューを判定する", () => {
    expect(isMainView("home")).toBe(true);
    expect(isMainView("folder")).toBe(true);
    expect(isMainView("search")).toBe(true);
    expect(isMainView("practice")).toBe(false);
    expect(isMainView(undefined)).toBe(false);
  });

  it("メインビューからは、その画面へ移る", () => {
    expect(resolveToggle("folder", "practice", "/folders/1")).toEqual({
      name: "practice",
    });
    expect(resolveToggle("search", "debug", "/search/a")).toEqual({
      name: "debug",
    });
  });

  it("今その画面なら、直前のメインビューへ戻る", () => {
    expect(resolveToggle("practice", "practice", "/folders/1")).toBe(
      "/folders/1",
    );
    expect(resolveToggle("debug", "debug", "/search/abc")).toBe("/search/abc");
  });

  it("戻り先がなければ home へ戻る", () => {
    expect(resolveToggle("debug", "debug", null)).toEqual({ name: "home" });
  });

  it("練習とデバッグの間は、押した先へ移る", () => {
    expect(resolveToggle("practice", "debug", "/")).toEqual({ name: "debug" });
    expect(resolveToggle("debug", "practice", "/")).toEqual({
      name: "practice",
    });
  });
});
