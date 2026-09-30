/** 認証の状態。unknown は初期化が終わるまで。 */
export type AuthStatus = "unknown" | "signedIn" | "signedOut";

/** 認証ライブラリ側の「今」の状態 */
export interface AuthSnapshot {
  signedIn: boolean;
  accessToken: string;
  /** アクセストークンの有効期限（unix time ms） */
  expiresAt: number;
}

/**
 * 認証ライブラリ（現在は gapi.auth2）を隠すためのインターフェース。
 * store はこれだけに依存するので、テストでは差し替えられる。
 */
export interface AuthClient {
  /** ライブラリを読み込んで初期化する */
  init(): Promise<void>;
  /** ライブラリが認識している現在の状態。未初期化なら signedIn: false */
  snapshot(): AuthSnapshot;
  /** サインイン状態やトークンが変わったときに呼ばれる。init() の後に登録する */
  onChange(listener: () => void): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** アクセストークンを取り直す */
  reloadToken(): Promise<void>;
  /** Drive API 用のクライアントにトークンを渡す（未初期化なら何もしない） */
  setToken(accessToken: string): void;
  /** Google のサインインボタンを描画する */
  renderSignInButton(element: HTMLElement): void;
}
