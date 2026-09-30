/**
 * localStorage の薄いラッパー。
 * Safari のプライベートブラウズや容量超過などで例外が出ても、アプリを止めない。
 */

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** 保存できたら true */
export function safeSetItem(key: string, value: string): boolean {
  try {
    const storage = getStorage();
    if (!storage) {
      return false;
    }
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    getStorage()?.removeItem(key);
  } catch {
    // 何もしない
  }
}

/** 壊れた JSON や未保存の場合は null */
export function readJson<T>(key: string): T | null {
  const raw = safeGetItem(key);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return safeSetItem(key, JSON.stringify(value));
}

export function listKeys(): string[] {
  try {
    const storage = getStorage();
    if (!storage) {
      return [];
    }
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }
    return keys;
  } catch {
    return [];
  }
}
