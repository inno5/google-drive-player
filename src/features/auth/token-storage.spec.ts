import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_TOKEN_STORAGE_KEY,
  TOKEN_MARGIN_MS,
  clearToken,
  loadValidToken,
  saveToken,
} from "./token-storage";

const NOW = 1_000_000_000_000;

describe("token-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("余裕のあるトークンを返す", () => {
    saveToken({ accessToken: "t", expiresAt: NOW + TOKEN_MARGIN_MS + 1 });
    expect(loadValidToken(NOW)).toEqual({
      accessToken: "t",
      expiresAt: NOW + TOKEN_MARGIN_MS + 1,
    });
  });

  it("期限まで余裕が足りないトークンは返さない", () => {
    saveToken({ accessToken: "t", expiresAt: NOW + TOKEN_MARGIN_MS });
    expect(loadValidToken(NOW)).toBeNull();
  });

  it("保存がない・壊れている場合は null", () => {
    expect(loadValidToken(NOW)).toBeNull();
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "{");
    expect(loadValidToken(NOW)).toBeNull();
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, '{"accessToken":""}');
    expect(loadValidToken(NOW)).toBeNull();
  });

  it("clearToken はトークンだけを消す", () => {
    localStorage.setItem("playlist", "[]");
    saveToken({ accessToken: "t", expiresAt: NOW + 10 * TOKEN_MARGIN_MS });
    clearToken();
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("playlist")).toBe("[]");
  });
});
