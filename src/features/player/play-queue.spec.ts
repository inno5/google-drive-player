import { describe, expect, it } from "vitest";
import {
  createShuffleQueue,
  pickNextInList,
  pickPrevInList,
} from "./play-queue";

const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
const ids = (item: { id: string } | null) => item?.id ?? null;

describe("pickNextInList / pickPrevInList", () => {
  it("次・前の曲を選び、端では折り返す", () => {
    expect(ids(pickNextInList(list, "a"))).toBe("b");
    expect(ids(pickNextInList(list, "c"))).toBe("a");
    expect(ids(pickPrevInList(list, "b"))).toBe("a");
    expect(ids(pickPrevInList(list, "a"))).toBe("c");
  });

  it("今の曲が一覧になければ 1 曲目", () => {
    expect(ids(pickNextInList(list, "zzz"))).toBe("a");
    expect(ids(pickNextInList(list, undefined))).toBe("a");
    expect(ids(pickPrevInList(list, "zzz"))).toBe("a");
  });

  it("1 曲だけなら同じ曲、一覧が空なら null", () => {
    expect(ids(pickNextInList([{ id: "x" }], "x"))).toBe("x");
    expect(ids(pickPrevInList([{ id: "x" }], "x"))).toBe("x");
    expect(pickNextInList([], "a")).toBeNull();
    expect(pickPrevInList([], "a")).toBeNull();
  });
});

describe("shuffle queue", () => {
  /** 常に候補の先頭を選ぶ */
  const first = () => 0;

  it("一巡するまで同じ曲を出さず、一巡したら次の巡目を始める", () => {
    const queue = createShuffleQueue(first);
    queue.noteStarted("a");
    const order: (string | null)[] = [];
    let current = "a";
    for (let i = 0; i < 5; i++) {
      const item = queue.next(list, current);
      order.push(ids(item));
      current = item?.id ?? current;
      queue.noteStarted(current);
    }
    // 1 巡目: b, c / 2 巡目（a だけ再生済みで始まらず、c を除いた候補から）: a, b, c…
    expect(order.slice(0, 2)).toEqual(["b", "c"]);
    expect(new Set(order.slice(2, 4)).size).toBe(2);
    expect(order[2]).not.toBe("c");
  });

  it("乱数で候補から選ぶ", () => {
    const queue = createShuffleQueue(() => 0.99);
    queue.noteStarted("a");
    expect(ids(queue.next(list, "a"))).toBe("c");
  });

  it("再生済みの曲は、一覧から消えても増えても影響しない", () => {
    const queue = createShuffleQueue(first);
    queue.noteStarted("a");
    queue.noteStarted("b");
    // c が消えて d が増えた
    const changed = [{ id: "a" }, { id: "b" }, { id: "d" }];
    expect(ids(queue.next(changed, "b"))).toBe("d");
  });

  it("1 曲だけなら今の曲、一覧が空なら null", () => {
    const queue = createShuffleQueue(first);
    queue.noteStarted("x");
    expect(ids(queue.next([{ id: "x" }], "x"))).toBe("x");
    expect(queue.next([], "x")).toBeNull();
  });

  it("再生した順に、履歴を戻れる", () => {
    const queue = createShuffleQueue(first);
    queue.noteStarted("a");
    queue.noteStarted("b");
    queue.noteStarted("c");
    expect(ids(queue.previous(list, "c"))).toBe("b");
    queue.noteStarted("b");
    expect(ids(queue.previous(list, "b"))).toBe("a");
    queue.noteStarted("a");
    expect(queue.previous(list, "a")).toBeNull();
    // 戻れなかったときも、履歴は壊れない
    expect(queue.previous(list, "a")).toBeNull();
  });

  it("履歴の曲が一覧から消えていたら、その前の曲へ", () => {
    const queue = createShuffleQueue(first);
    queue.noteStarted("a");
    queue.noteStarted("b");
    queue.noteStarted("c");
    expect(ids(queue.previous([{ id: "a" }, { id: "c" }], "c"))).toBe("a");
  });

  it("reset で巡目と履歴をやり直す", () => {
    const queue = createShuffleQueue(first);
    queue.noteStarted("a");
    queue.noteStarted("b");
    queue.reset();
    expect(queue.previous(list, "b")).toBeNull();
    expect(ids(queue.next(list, "c"))).toBe("a");
  });
});
