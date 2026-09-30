import {
  readJson,
  safeRemoveItem,
  writeJson,
} from "@/shared/storage/safe-storage";

/**
 * 最後に取得したアクセストークンの保存。
 *
 * iOS の Safari / ホーム画面アプリでは gapi.auth2 が起動時にサインイン状態を
 * 復元できないため、有効期限内はこの保存済みトークンでサインイン状態にする。
 * 消すのはサインアウトしたときと期限切れのときだけ（他のデータは消さない）。
 */
export const AUTH_TOKEN_STORAGE_KEY = "gdp:auth-token";

/** 期限まであとこの時間を切ったトークンは使わない（再生中に切れるのを避ける） */
export const TOKEN_MARGIN_MS = 5 * 60 * 1000;

export interface StoredToken {
  accessToken: string;
  /** unix time ms */
  expiresAt: number;
}

export function saveToken(token: StoredToken): void {
  writeJson(AUTH_TOKEN_STORAGE_KEY, token);
}

/** 期限まで marginMs 以上あるトークンだけを返す。なければ null */
export function loadValidToken(
  now: number = Date.now(),
  marginMs: number = TOKEN_MARGIN_MS,
): StoredToken | null {
  const data = readJson<Partial<StoredToken>>(AUTH_TOKEN_STORAGE_KEY);
  if (
    !data ||
    typeof data.accessToken !== "string" ||
    data.accessToken === "" ||
    typeof data.expiresAt !== "number"
  ) {
    return null;
  }
  if (data.expiresAt - now <= marginMs) {
    return null;
  }
  return { accessToken: data.accessToken, expiresAt: data.expiresAt };
}

export function clearToken(): void {
  safeRemoveItem(AUTH_TOKEN_STORAGE_KEY);
}
