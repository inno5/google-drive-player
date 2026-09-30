import { loadScript } from "@/shared/lib/load-script";
import { withTimeout } from "@/shared/lib/timeout";
import type { AuthClient, AuthSnapshot } from "./auth-client";

/**
 * Google Sign-In JavaScript ライブラリ（platform.js / gapi.auth2）のラッパー。
 * このライブラリは Google により非推奨（2022-07-29 以降に作成したクライアント ID では
 * 使用不可）。既存のクライアント ID が使える間は継続し、置き換える場合は
 * AuthClient を実装し直すだけで済むよう、gapi への依存はこのファイルに閉じ込める。
 */

const PLATFORM_URL = "https://apis.google.com/js/platform.js";
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];
export const DRIVE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";
const INIT_TIMEOUT_MS = 15_000;

// gapi の型は使う部分だけを自前で定義する（@types/gapi.* に依存しない）
interface GapiAuthResponse {
  access_token: string;
  expires_at: number;
}

interface GapiGoogleUser {
  getAuthResponse(includeAuthorizationData?: boolean): GapiAuthResponse;
  reloadAuthResponse(): Promise<GapiAuthResponse>;
}

interface GapiGoogleAuth {
  isSignedIn: {
    get(): boolean;
    listen(callback: (signedIn: boolean) => void): void;
  };
  currentUser: {
    get(): GapiGoogleUser;
    listen(callback: (user: GapiGoogleUser) => void): void;
  };
  signIn(): Promise<unknown>;
  signOut(): Promise<unknown>;
}

interface GapiLoadOptions {
  callback: () => void;
  onerror?: () => void;
  timeout?: number;
  ontimeout?: () => void;
}

interface GapiGlobal {
  load(libraries: string, options: GapiLoadOptions): void;
  client: {
    init(options: {
      apiKey: string;
      clientId: string;
      discoveryDocs: string[];
      scope: string;
    }): Promise<void>;
    setToken(token: { access_token: string } | null): void;
  };
  auth2: {
    getAuthInstance(): GapiGoogleAuth;
  };
  signin2: {
    render(element: HTMLElement, options: Record<string, unknown>): void;
  };
}

declare global {
  interface Window {
    gapi?: GapiGlobal;
  }
}

export interface GapiAuthConfig {
  clientId: string;
  apiKey: string;
}

function requireGapi(): GapiGlobal {
  if (!window.gapi) {
    throw new Error("Google の認証ライブラリ（gapi）を読み込めませんでした");
  }
  return window.gapi;
}

function isPopupClosed(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { error?: unknown }).error === "popup_closed_by_user"
  );
}

export function createGapiAuthClient(config: GapiAuthConfig): AuthClient {
  let auth: GapiGoogleAuth | null = null;

  function requireAuth(): GapiGoogleAuth {
    if (!auth) {
      throw new Error("認証が初期化されていません");
    }
    return auth;
  }

  async function initGapi(): Promise<void> {
    await loadScript(PLATFORM_URL);
    const gapi = requireGapi();

    await new Promise<void>((resolve, reject) => {
      gapi.load("client:auth2", {
        callback: () => resolve(),
        onerror: () => reject(new Error("gapi の読み込みに失敗しました")),
        timeout: INIT_TIMEOUT_MS,
        ontimeout: () =>
          reject(new Error("gapi の読み込みがタイムアウトしました")),
      });
    });

    await gapi.client.init({
      apiKey: config.apiKey,
      clientId: config.clientId,
      discoveryDocs: DISCOVERY_DOCS,
      scope: DRIVE_READONLY_SCOPE,
    });
    auth = gapi.auth2.getAuthInstance();
  }

  return {
    init() {
      return withTimeout(
        initGapi(),
        INIT_TIMEOUT_MS,
        "Google 認証の初期化がタイムアウトしました",
      );
    },

    snapshot(): AuthSnapshot {
      if (!auth || !auth.isSignedIn.get()) {
        return { signedIn: false, accessToken: "", expiresAt: 0 };
      }
      const response = auth.currentUser.get().getAuthResponse(true);
      return {
        signedIn: true,
        accessToken: response.access_token,
        expiresAt: response.expires_at,
      };
    },

    onChange(listener) {
      const google = requireAuth();
      google.isSignedIn.listen(() => listener());
      // アクセストークンが自動更新されたときも通知される
      google.currentUser.listen(() => listener());
    },

    async signIn() {
      try {
        await requireAuth().signIn();
      } catch (error) {
        // ユーザーがポップアップを閉じただけならエラーにしない
        if (!isPopupClosed(error)) {
          throw error;
        }
      }
    },

    async signOut() {
      await requireAuth().signOut();
    },

    async reloadToken() {
      await requireAuth().currentUser.get().reloadAuthResponse();
    },

    setToken(accessToken) {
      window.gapi?.client?.setToken({ access_token: accessToken });
    },

    renderSignInButton(element) {
      window.gapi?.signin2.render(element, {
        scope: "profile email",
        width: 180,
        height: 40,
        longtitle: true,
        theme: "dark",
      });
    },
  };
}
