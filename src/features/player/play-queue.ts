/** 曲順を決める純粋関数。フォルダは呼び出し側で除いた「再生できる曲の一覧」を渡す */

interface HasId {
  id: string;
}

/** 通常再生: 一覧の次（末尾の次は先頭）。今の曲が一覧になければ 1 曲目。一覧が空なら null */
export function pickNextInList<T extends HasId>(
  list: readonly T[],
  currentId: string | undefined,
): T | null {
  if (list.length === 0) {
    return null;
  }
  const index = list.findIndex((item) => item.id === currentId);
  if (index < 0) {
    return list[0] ?? null;
  }
  return list[(index + 1) % list.length] ?? null;
}

/** 通常再生: 一覧の前（先頭の前は末尾）。今の曲が一覧になければ 1 曲目。一覧が空なら null */
export function pickPrevInList<T extends HasId>(
  list: readonly T[],
  currentId: string | undefined,
): T | null {
  if (list.length === 0) {
    return null;
  }
  const index = list.findIndex((item) => item.id === currentId);
  if (index < 0) {
    return list[0] ?? null;
  }
  return list[(index - 1 + list.length) % list.length] ?? null;
}

const MAX_HISTORY = 500;

/**
 * シャッフル。一巡するまで同じ曲を出さない。
 * 一覧は毎回渡してもらうので、曲が増減しても候補に反映される。
 */
export interface ShuffleQueue {
  /** 次の曲。一巡したら次の巡目を始める。一覧が空なら null（1 曲だけなら今の曲） */
  next<T extends HasId>(
    list: readonly T[],
    currentId: string | undefined,
  ): T | null;
  /** 再生した順の履歴を 1 つ戻る。戻れなければ null */
  previous<T extends HasId>(
    list: readonly T[],
    currentId: string | undefined,
  ): T | null;
  /** 曲の再生を始めたことを記録する（今の巡目で再生済みにし、履歴に積む） */
  noteStarted(id: string): void;
  /** 巡目と履歴をやり直す */
  reset(): void;
}

export function createShuffleQueue(
  random: () => number = Math.random,
): ShuffleQueue {
  const played = new Set<string>();
  let history: string[] = [];

  return {
    next(list, currentId) {
      let candidates = list.filter(
        (item) => !played.has(item.id) && item.id !== currentId,
      );
      if (candidates.length === 0) {
        // 一巡した。今の曲だけを再生済みにして、次の巡目を始める
        played.clear();
        if (currentId !== undefined) {
          played.add(currentId);
        }
        candidates = list.filter((item) => item.id !== currentId);
        if (candidates.length === 0) {
          return list[0] ?? null;
        }
      }
      const index = Math.min(
        Math.floor(random() * candidates.length),
        candidates.length - 1,
      );
      return candidates[index] ?? null;
    },

    previous(list, currentId) {
      const last = history[history.length - 1];
      const droppedCurrent = currentId !== undefined && last === currentId;
      if (droppedCurrent) {
        history.pop();
      }
      for (;;) {
        const id = history.pop();
        if (id === undefined) {
          break;
        }
        const item = list.find((candidate) => candidate.id === id);
        if (item) {
          return item;
        }
      }
      if (droppedCurrent && currentId !== undefined) {
        history.push(currentId);
      }
      return null;
    },

    noteStarted(id) {
      played.add(id);
      if (history[history.length - 1] !== id) {
        history.push(id);
        if (history.length > MAX_HISTORY) {
          history = history.slice(-MAX_HISTORY);
        }
      }
    },

    reset() {
      played.clear();
      history = [];
    },
  };
}
