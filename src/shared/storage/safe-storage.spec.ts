import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listKeys,
  readJson,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  writeJson,
} from "./safe-storage";

describe("safe-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("値を保存して読み出せる", () => {
    expect(safeSetItem("a", "1")).toBe(true);
    expect(safeGetItem("a")).toBe("1");
    safeRemoveItem("a");
    expect(safeGetItem("a")).toBeNull();
  });

  it("JSON を保存して読み出せる。壊れた JSON は null", () => {
    expect(writeJson("j", { x: 1 })).toBe(true);
    expect(readJson<{ x: number }>("j")).toEqual({ x: 1 });
    localStorage.setItem("bad", "{");
    expect(readJson("bad")).toBeNull();
  });

  it("キー一覧を返す", () => {
    localStorage.setItem("a", "1");
    localStorage.setItem("b", "2");
    expect(listKeys().sort()).toEqual(["a", "b"]);
  });

  it("localStorage が例外を投げても落ちない", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
      key: () => {
        throw new Error("denied");
      },
      get length(): number {
        throw new Error("denied");
      },
    };
    vi.stubGlobal("localStorage", broken);
    expect(safeGetItem("a")).toBeNull();
    expect(safeSetItem("a", "1")).toBe(false);
    expect(() => {
      safeRemoveItem("a");
    }).not.toThrow();
    expect(listKeys()).toEqual([]);
  });
});
