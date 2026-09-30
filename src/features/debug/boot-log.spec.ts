import { beforeEach, describe, expect, it } from "vitest";
import {
  clearBootLog,
  loadBootLog,
  recordBoot,
  updateLatestBoot,
} from "./boot-log";

describe("boot-log", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("起動を記録する", () => {
    localStorage.setItem("other", "1");
    recordBoot(new Date("2026-01-01T00:00:00Z"));
    const [record] = loadBootLog();
    expect(record).toMatchObject({
      time: "2026-01-01T00:00:00.000Z",
      standalone: false,
      storageKeys: 1,
      statusAfterInit: null,
    });
  });

  it("直近 10 回だけ残す", () => {
    for (let i = 0; i < 12; i++) {
      recordBoot(new Date(2026, 0, 1, 0, i));
    }
    expect(loadBootLog()).toHaveLength(10);
  });

  it("最新の記録だけを更新する", () => {
    recordBoot();
    recordBoot();
    updateLatestBoot({ statusAfterInit: "signedIn" });
    const log = loadBootLog();
    expect(log[0]?.statusAfterInit).toBeNull();
    expect(log[1]?.statusAfterInit).toBe("signedIn");
  });

  it("記録がなければ更新しても何も起きない", () => {
    updateLatestBoot({ statusAfterInit: "x" });
    expect(loadBootLog()).toEqual([]);
  });

  it("clearBootLog で消える", () => {
    recordBoot();
    clearBootLog();
    expect(loadBootLog()).toEqual([]);
  });
});
