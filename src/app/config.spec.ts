import { describe, expect, it } from "vitest";
import { readConfig } from "./config";

describe("readConfig", () => {
  it("設定を返す", () => {
    expect(
      readConfig({ VITE_GOOGLE_CLIENT_ID: " id ", VITE_GOOGLE_API_KEY: "key" }),
    ).toEqual({ googleClientId: "id", googleApiKey: "key" });
  });

  it("足りない変数名を示して例外にする", () => {
    expect(() => readConfig({ VITE_GOOGLE_CLIENT_ID: "id" })).toThrow(
      "VITE_GOOGLE_API_KEY",
    );
    expect(() => readConfig({})).toThrow(
      "VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_API_KEY",
    );
  });
});
