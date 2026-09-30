import { ref } from "vue";
import { defineStore } from "pinia";
import type { AuthClient, AuthSnapshot, AuthStatus } from "./auth-client";
import { AuthExpiredError, AuthRequiredError } from "./errors";
import {
  TOKEN_MARGIN_MS,
  clearToken,
  loadValidToken,
  saveToken,
} from "./token-storage";

const SIGNED_OUT: AuthSnapshot = {
  signedIn: false,
  accessToken: "",
  expiresAt: 0,
};

/** gapi は Error ではなく { error, details } を reject することがある */
function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    const { details, error: code } = error as {
      details?: unknown;
      error?: unknown;
    };
    if (typeof details === "string") {
      return details;
    }
    if (typeof code === "string") {
      return code;
    }
  }
  return String(error);
}

/**
 * 認証の状態。
 *
 * - 「未サインイン」と判定されただけでは、保存データ（プレイリストや設定など）を
 *   消さない。消すのは、ユーザーが明示的にサインアウトしたときの認証用トークンだけ。
 * - 認証ライブラリがサインイン状態を復元できない環境（iOS）では、期限内の保存済み
 *   トークンでサインイン状態にする。
 */
export const useAuthStore = defineStore("auth", () => {
  const status = ref<AuthStatus>("unknown");
  const accessToken = ref("");
  /** アクセストークンの有効期限（unix time ms） */
  const expiresAt = ref(0);
  /** 認証ライブラリ自身がサインイン済みと認識しているか（デバッグ用） */
  const gapiSignedIn = ref(false);
  /** 保存済みトークンでサインイン状態にしたか（デバッグ用） */
  const restoredFromStorage = ref(false);
  const error = ref<string | null>(null);

  let client: AuthClient | null = null;
  let initPromise: Promise<void> | null = null;

  function setSignedOut(): void {
    status.value = "signedOut";
    accessToken.value = "";
    expiresAt.value = 0;
    restoredFromStorage.value = false;
  }

  /** 認証ライブラリの状態と保存済みトークンから、store の状態を決める */
  function apply(): void {
    const snapshot = client?.snapshot() ?? SIGNED_OUT;
    gapiSignedIn.value = snapshot.signedIn;

    if (snapshot.signedIn) {
      status.value = "signedIn";
      accessToken.value = snapshot.accessToken;
      expiresAt.value = snapshot.expiresAt;
      restoredFromStorage.value = false;
      saveToken({
        accessToken: snapshot.accessToken,
        expiresAt: snapshot.expiresAt,
      });
      return;
    }

    const stored = loadValidToken();
    if (stored) {
      status.value = "signedIn";
      accessToken.value = stored.accessToken;
      expiresAt.value = stored.expiresAt;
      restoredFromStorage.value = true;
      client?.setToken(stored.accessToken);
      return;
    }

    setSignedOut();
  }

  async function runInit(authClient: AuthClient): Promise<void> {
    try {
      await authClient.init();
      authClient.onChange(apply);
    } catch (e) {
      // 初期化に失敗しても、保存済みトークンが有効ならそれで使える
      error.value = toMessage(e);
    }
    apply();
  }

  /** 認証を初期化する。2 回目以降は最初の結果を返す */
  function init(authClient: AuthClient): Promise<void> {
    if (!initPromise) {
      client = authClient;
      initPromise = runInit(authClient);
    }
    return initPromise;
  }

  /** 初期化が終わるまで待つ（ルーターのガード用）。失敗しても reject しない */
  function whenReady(): Promise<void> {
    return initPromise ?? Promise.resolve();
  }

  async function signIn(): Promise<void> {
    if (!client) {
      throw new Error("認証が初期化されていません");
    }
    error.value = null;
    try {
      await client.signIn();
    } catch (e) {
      error.value = toMessage(e);
      return;
    }
    apply();
  }

  /** ユーザーが明示的にサインアウトする。他の保存データは消さない */
  async function signOut(): Promise<void> {
    clearToken();
    try {
      await client?.signOut();
    } catch (e) {
      error.value = toMessage(e);
    }
    apply();
  }

  /**
   * Drive API 用の有効なアクセストークンを返す。
   * 期限が近ければ更新する。更新できなければ signedOut にして AuthExpiredError。
   */
  async function getValidToken(): Promise<string> {
    await whenReady();
    if (status.value !== "signedIn") {
      throw new AuthRequiredError();
    }
    if (expiresAt.value - Date.now() > TOKEN_MARGIN_MS) {
      return accessToken.value;
    }

    // 認証ライブラリがサインイン済みの場合だけ、更新できる
    if (!restoredFromStorage.value && client) {
      try {
        await client.reloadToken();
      } catch (e) {
        error.value = toMessage(e);
      }
      apply();
      if (
        status.value === "signedIn" &&
        expiresAt.value - Date.now() > TOKEN_MARGIN_MS
      ) {
        return accessToken.value;
      }
    }

    expire();
    throw new AuthExpiredError();
  }

  /**
   * アクセストークンを強制的に取り直す（API が 401 を返したとき用）。
   * 取り直せなければ signedOut にして AuthExpiredError。
   */
  async function refreshToken(): Promise<string> {
    await whenReady();
    if (!restoredFromStorage.value && client) {
      try {
        await client.reloadToken();
      } catch (e) {
        error.value = toMessage(e);
      }
      apply();
      if (status.value === "signedIn" && !restoredFromStorage.value) {
        return accessToken.value;
      }
    }
    expire();
    throw new AuthExpiredError();
  }

  /** トークンが使えないと分かったとき、保存トークンを消して signedOut にする */
  function expire(): void {
    clearToken();
    setSignedOut();
  }

  function renderSignInButton(element: HTMLElement): void {
    client?.renderSignInButton(element);
  }

  return {
    status,
    accessToken,
    expiresAt,
    gapiSignedIn,
    restoredFromStorage,
    error,
    init,
    whenReady,
    signIn,
    signOut,
    getValidToken,
    refreshToken,
    expire,
    renderSignInButton,
  };
});
