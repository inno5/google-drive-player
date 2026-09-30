import { describe, expect, it } from "vitest";
import { isMainView, resolveNav } from "./header-nav";

describe("header-nav", () => {
  it("メインビューを判定する", () => {
    expect(isMainView("home")).toBe(true);
    expect(isMainView("folder")).toBe(true);
    expect(isMainView("search")).toBe(true);
    expect(isMainView("practice")).toBe(false);
    expect(isMainView(undefined)).toBe(false);
  });

  it("練習・デバッグは、その画面へ移る", () => {
    expect(resolveNav("practice", "/folders/1")).toEqual({ name: "practice" });
    expect(resolveNav("debug", "/search/a")).toEqual({ name: "debug" });
  });

  it("メインは、直前のメインビューを開く", () => {
    expect(resolveNav("main", "/folders/1")).toBe("/folders/1");
    expect(resolveNav("main", "/search/abc")).toBe("/search/abc");
  });

  it("直前のメインビューがなければ home を開く", () => {
    expect(resolveNav("main", null)).toEqual({ name: "home" });
  });
});
