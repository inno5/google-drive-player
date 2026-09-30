import { describe, expect, it } from "vitest";
import { createClickCounter } from "./click-count";

describe("createClickCounter", () => {
  it("間隔内の 2 回目は double、そのあとは数え直す", () => {
    const count = createClickCounter(350);
    expect(count(1000)).toBe("single");
    expect(count(1200)).toBe("double");
    expect(count(1300)).toBe("single");
    expect(count(1400)).toBe("double");
  });

  it("間隔を過ぎたら single", () => {
    const count = createClickCounter(350);
    expect(count(1000)).toBe("single");
    expect(count(1351)).toBe("single");
    expect(count(1700)).toBe("double");
  });

  it("最初のクリックは、時刻が小さくても single", () => {
    expect(createClickCounter(350)(0)).toBe("single");
  });
});
