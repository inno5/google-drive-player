import { isStandalone } from "@/shared/lib/platform";
import {
  listKeys,
  readJson,
  safeRemoveItem,
  writeJson,
} from "@/shared/storage/safe-storage";

/**
 * 起動ごとの状態の記録（直近 MAX_RECORDS 回）。
 * iOS のホーム画面アプリで、終了して開き直したときに何が残るかを確かめるためのもの。
 */
export const BOOT_LOG_STORAGE_KEY = "gdp:boot-log";
const MAX_RECORDS = 10;

export interface BootRecord {
  /** 起動時刻（ISO 8601） */
  time: string;
  /** ホーム画面アプリとして起動したか */
  standalone: boolean;
  /** 起動した時点の localStorage のキー数 */
  storageKeys: number;
  /** 認証ライブラリが、初期化直後にサインイン済みと認識していたか */
  gapiSignedIn: boolean | null;
  /** 保存済みトークンでサインイン状態にしたか */
  restoredFromStorage: boolean | null;
  /** 初期化直後の認証状態 */
  statusAfterInit: string | null;
  /** 初期化から 5 秒後の認証状態 */
  statusAfter5s: string | null;
}

export function loadBootLog(): BootRecord[] {
  const records = readJson<BootRecord[]>(BOOT_LOG_STORAGE_KEY);
  return Array.isArray(records) ? records : [];
}

/** 起動直後（他の処理が localStorage に触る前）に呼ぶ */
export function recordBoot(now: Date = new Date()): void {
  const records = loadBootLog();
  records.push({
    time: now.toISOString(),
    standalone: isStandalone(),
    storageKeys: listKeys().length,
    gapiSignedIn: null,
    restoredFromStorage: null,
    statusAfterInit: null,
    statusAfter5s: null,
  });
  writeJson(BOOT_LOG_STORAGE_KEY, records.slice(-MAX_RECORDS));
}

/** 最新の起動の記録を更新する */
export function updateLatestBoot(patch: Partial<BootRecord>): void {
  const records = loadBootLog();
  const latest = records[records.length - 1];
  if (!latest) {
    return;
  }
  Object.assign(latest, patch);
  writeJson(BOOT_LOG_STORAGE_KEY, records);
}

export function clearBootLog(): void {
  safeRemoveItem(BOOT_LOG_STORAGE_KEY);
}
