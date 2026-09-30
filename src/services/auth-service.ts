import { Env } from "@/env/env";
import { appState } from "@/state/app-state";
import { gapi } from "./gapi-service";
import { debugLog } from "@/utils/debug-log";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

// gapi.auth2 がサインイン状態を復元できない環境（iOS Safari / ホーム画面アプリ）向けに、
// 最後に取得したアクセストークンを保存しておく。有効期限内はそのトークンで動作させる。
const TOKEN_STORAGE_KEY = "ls-key-auth-token";
// 期限ぎりぎりのトークンを使って再生中に切れないよう、この時間より短ければ無効として扱う
const TOKEN_MARGIN_MS = 5 * 60 * 1000;

interface StoredToken {
  accessToken: string;
  expiresAt: number; // unix time ms
}

class AuthService {
  /**
   * 認証トークン
   */
  private _token = "";

  getToken() {
    return this._token;
  }

  /**
   * 現在のサインイン状態
   */
  get isSignedIn(): boolean {
    return gapi.auth2.getAuthInstance().isSignedIn.get();
  }

  /**
   * 初期化
   * Vueマウント前に終わらせること
   */
  init(callback: () => void) {
    gapi.load("client:auth2", () => {
      gapi.client
        .init({
          apiKey: Env.GCP_API_KEY,
          clientId: Env.GCP_OAUTH2_CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES,
        })
        .then(
          () => {
            const authInstance = gapi.auth2.getAuthInstance();
            authInstance.isSignedIn.listen(() => {
              this._updateSigninStatus();
            });
            // アクセストークンが自動更新されたときに保持しているトークンを差し替える
            authInstance.currentUser.listen(() => {
              this._updateSigninStatus();
            });
            this._updateSigninStatus();

            debugLog.setSignedInAtInit(this.isSignedIn);
            setTimeout(() => {
              debugLog.setSignedInAfter5s(this.isSignedIn);
            }, 5000);

            callback();
          },
          (err: Error) => {
            alert(err);
            console.log(err);
          }
        );
    });
  }

  private _updateSigninStatus(): void {
    if (this.isSignedIn) {
      const res = gapi.auth2
        .getAuthInstance()
        .currentUser.get()
        .getAuthResponse();
      this._token = res.access_token;
      this._saveToken(res.access_token, res.expires_at);
      appState.isSignedIn = true;
      return;
    }

    // gapi.auth2 が未サインインと判定した場合でも、保存済みのトークンが有効ならそれを使う。
    // iOS では gapi.auth2 が起動時にサインイン状態を復元できないため。
    // 保存データ（プレイリスト・設定・タグ）は、未サインイン判定だけでは消さない。
    const stored = this._loadValidToken();
    if (stored) {
      this._token = stored.accessToken;
      gapi.client.setToken({ access_token: stored.accessToken });
      appState.isSignedIn = true;
      debugLog.setTokenRestored(true);
    } else {
      this._token = "";
      appState.isSignedIn = false;
    }
  }

  private _saveToken(accessToken: string, expiresAt: number): void {
    const data: StoredToken = { accessToken, expiresAt };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(data));
  }

  private _loadValidToken(): StoredToken | null {
    try {
      const data: StoredToken | null = JSON.parse(
        localStorage.getItem(TOKEN_STORAGE_KEY) || "null"
      );
      if (
        data &&
        data.accessToken &&
        data.expiresAt - Date.now() > TOKEN_MARGIN_MS
      ) {
        return data;
      }
    } catch (e) {
      // 壊れたデータは無効として扱う
    }
    return null;
  }

  private _clearToken(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  /**
   * サインアウト
   */
  signout() {
    // 保存済みトークンは、ユーザーが明示的にサインアウトしたときにだけ消す
    this._clearToken();
    gapi.auth2
      .getAuthInstance()
      .signOut()
      // gapi 側がもともと未サインインの場合は isSignedIn のリスナーが動かないため、明示的に反映する
      .then(() => this._updateSigninStatus());
  }

  /**
   * サインインボタンの生成
   * @param elm
   */
  renderSignInButton(elm: HTMLElement): void {
    gapi.signin2.render(elm, {
      scope: "profile email",
      width: 180,
      height: 40,
      longtitle: true,
      theme: "dark",
    });
  }
}

export const authService = new AuthService();
