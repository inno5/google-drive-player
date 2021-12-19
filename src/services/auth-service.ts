import { Env } from "@/env/env";
import { appState } from "@/state/app-state";
import { gapi } from "./gapi-service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

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
            gapi.auth2.getAuthInstance().isSignedIn.listen(() => {
              this._updateSigninStatus();
            });
            this._updateSigninStatus();
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
    const isSignedIn = this.isSignedIn;
    if (isSignedIn) {
      const token = gapi.auth2
        .getAuthInstance()
        .currentUser.get()
        .getAuthResponse().access_token;
      this._token = token;
    } else {
      appState.clearLocalStorage();
      this._token = "";
    }

    // ステート更新
    appState.isSignedIn = isSignedIn;
  }

  /**
   * サインアウト
   */
  signout() {
    gapi.auth2.getAuthInstance().signOut();
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
