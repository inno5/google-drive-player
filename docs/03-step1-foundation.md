# 03. ステップ 1: 基盤と認証

ステップ 1 のゴールは、Vue 3.5 の新しい骨組みの上で Google サインインが通り、lint・format・型チェック・テストが揃って動く状態にすること。あわせて、アプリ自身が保存データを消してしまう不具合を解消する。Drive 一覧や再生はステップ 2 以降で扱う。

## 範囲

| 含む | 含まない |
| --- | --- |
| [02](./02-rebuild-policy.md) のディレクトリ構成（中身が空の feature はディレクトリだけ作る） | Drive 一覧・検索・再生・プレイリスト |
| ESLint / Prettier / TypeScript / Vitest / vue-tsc の設定と npm scripts | E2E テスト（Playwright） |
| 認証（現行の gapi.auth2 を継続）、auth store、ルーターの認証ガード、SignInPage、サインアウト | 認証ライブラリの置き換え（[02](./02-rebuild-policy.md) の未決事項） |
| iOS 検証用のデバッグページ `/debug`（[04](./04-ios-auth-persistence.md) の E0） | PWA の本格対応（manifest とアイコンの最低限だけは入れる） |
| Firebase Hosting のプレビューチャンネルへのデプロイ手順 | 本番への切り替え |

## npm scripts（予定）

| script | 内容 |
| --- | --- |
| `dev` | `vite` |
| `build` | `vue-tsc --noEmit && vite build` |
| `lint` / `lint:fix` | `eslint .` / `eslint . --fix` |
| `format` / `format:check` | `prettier --write src/` / `prettier --check src/` |
| `typecheck` | `vue-tsc --noEmit` |
| `test` / `test:watch` | `vitest run` / `vitest` |
| `check` | `lint` + `format:check` + `typecheck` + `test` をまとめて実行 |

- 環境変数: `.env.local` と `.env.production` に `VITE_GOOGLE_CLIENT_ID` と `VITE_GOOGLE_API_KEY` を置き、`.env.example` だけをコミットする。
- 現行の `env/` と `scripts/set_env.sh` によるコピー方式は廃止する。
- **OAuth クライアント ID は現行のものを使い続ける。** gapi.auth2 は 2022-07-29 以降に作られたクライアント ID では動かないため、新しく作り直してはいけない。

## 認証の設計（gapi.auth2 を継続）

```
SignInPage ─ signIn() ─▶ auth store ─▶ gapi-auth.ts（platform.js / gapi.auth2 のラッパー）
                            │
                            ├─ isSignedIn.listen / currentUser.listen で状態とトークンを反映
                            └─ app-storage（保存データ）には触らない。触るのは signOut() のときの認証関連キーだけ
router.beforeEach ─ status を参照（unknown のうちは init() の完了を待つ）
```

- `gapi-auth.ts`: Vue に依存しない薄いラッパーにする。役割は次の 3 つ。
    - platform.js を読み込んで `gapi.load('client:auth2')` と `gapi.client.init({ apiKey, clientId, discoveryDocs, scope })` を行う。
    - `signIn()`、`signOut()`、`currentUser.get().getAuthResponse(true)`、`reloadAuthResponse()` を公開する。
    - 型は `@types/gapi.auth2` と `@types/gapi.client.drive-v3` で付ける。
- `auth-store.ts`:
    - `status`: `unknown`（初期化中）/ `signedIn` / `signedOut`。**`unknown` と `signedOut` を区別する**。初期化が終わる前や失敗したときに「未サインイン」とは扱わない。
    - `init()`: ライブラリを初期化して `isSignedIn.get()` を反映する。以後の変化は `isSignedIn.listen` で受け取る。トークンの更新は `currentUser.listen` で受け取る（現行はトークン更新を受け取っていない）。
    - `getValidToken()`: 期限（`expires_at`）まで 5 分を切っていたら `reloadAuthResponse()` で更新してから返す。
    - `signOut()`: ユーザーが明示的に操作したときだけ実行する。`auth2.signOut()` の後、アプリが保存した認証関連のキーだけを消す。
- **保存済みトークンの再利用**: `gapi.auth2` が未サインインと判定しても、直近に取得したアクセストークン（と `expires_at`）を保存しておき、残り有効期間が 5 分以上あればそれでサインイン状態にする（`gapi.client.setToken()` にも渡す）。iOS の Safari とホーム画面アプリでは `gapi.auth2` がサインイン状態を復元できないため、これが必要（現行版で実機確認済み。[04](./04-ios-auth-persistence.md)）。有効期間を過ぎたら `signedOut` としてログイン画面から入り直す。サーバー側の処理は持たない。トークンを消すのは、ユーザーが明示的にサインアウトしたときだけ。
- **全消去の禁止**: 現行の `_updateSigninStatus()` は未サインインと判定すると `localStorage.clear()` を実行している。新しい実装では、`isSignedIn` が false になったというだけでは何も消さない。プレイリスト・設定・タグのキャッシュは、ユーザーの明示的な操作（「すべてのデータを消去」）がない限り残す。
- スコープは現行と同じ `drive.readonly`。サインインボタンは `gapi.signin2.render` か、自前のボタンから `auth2.signIn()` を呼ぶ（`profile email` のスコープも、現行と同じく結果として付く）。
- GCP の OAuth クライアントには、承認済み JavaScript 生成元として本番・プレビューチャンネル・`localhost` の URL を登録する。

## テスト

| 種類 | 対象 | 方法 |
| --- | --- | --- |
| Unit | auth store（init、unknown / signedIn / signedOut の遷移、トークン更新の反映、期限前の reload、signOut で認証以外のデータを消さないこと、**isSignedIn が false になっても何も消さないこと**） | gapi-auth をモックする |
| Unit | router ガード（unknown → 待機、signedOut → /signin、signedIn で /signin → /） | テスト用ルーターと Pinia を使う |
| Component | SignInPage（ボタン押下で signIn が呼ばれる、失敗時の表示） | @vue/test-utils |
| 手動 | PC の Chrome / Safari、iOS Safari、iOS ホーム画面アプリでのサインイン・リロード・1 時間以上の利用・サインアウト | プレビューチャンネルの URL で確認する |

## 完了条件

- [ ] `check` script がエラー 0・警告 0 で通る
- [ ] PC ブラウザでサインイン → リロード → サインイン状態が保たれる
- [ ] サインインから 1 時間を超えても Drive API が 401 にならない
- [ ] iOS（Safari とホーム画面アプリ）で、終了して開き直してもログイン状態が保たれる（有効期間内）
- [ ] 有効期間を過ぎたときは、ログイン画面から入り直せる
- [ ] 未サインインと判定されても保存データが消えない（Unit テストと `/debug` で確認）
- [ ] サインアウトすると認証関連の情報だけが消え、他の保存データは残る
- [ ] `/debug` ページがプレビューチャンネルで開け、iOS の検証（[04](./04-ios-auth-persistence.md)）を始められる
