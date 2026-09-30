# 02. 作り直しの方針と全体設計

## 大方針

- 既存コードやアーキテクチャは踏襲しない。機能要件だけを引き継ぎ、Vue 3.5 の最新の書き方でゼロから作り直す。
- わかりやすさを最優先する。1 ファイル 1 責務。UI・状態・外部 API を層で分け、依存の向きは一方向（UI → 状態 → 外部 API ラッパー）にする。
- 外部 SDK（gapi.auth2 / gapi.client、Drive API、タグ読み取り）は必ず薄いラッパーの内側に閉じ込め、テストで差し替えられるようにする。
- 認証は現行の gapi.auth2 を継続して使う（実機で動作確認済み）。将来の置き換えに備えて、ラッパー（`gapi-auth.ts`）より外には依存させない。
- 保存データはユーザーの明示的な操作でしか消さない（現行の「未サインイン判定で全消去」は廃止する）。

## 引き継ぐ機能要件

- Google アカウントでサインインし、Drive（drive.readonly）内のフォルダと音声ファイルを閲覧・検索する
- フォルダ単位（サブフォルダを含む）またはファイル単位でプレイリストに追加・削除・並べ替えする。プレイリストは端末に保存する
- 再生・停止・前後の曲・シーク、リピート・シャッフル、表示モード（タイトル - アーティスト / 詳細 / ファイル名）
- ID3 タグを読み取り、読み取った結果を端末に保存する
- スマートフォンとデスクトップの両方に対応し、iOS のホーム画面アプリとしても使えること

## 技術スタック

| 用途 | 採用 | 備考 |
| --- | --- | --- |
| フレームワーク | Vue 3.5 系 | `<script setup lang="ts">` のみ。props の分割代入、`defineModel`、`useTemplateRef`、`useId` を使う |
| ビルド | Vite（最新安定版） | 環境変数は `import.meta.env.VITE_*` |
| 言語 | TypeScript（strict） | 型チェックは `vue-tsc --noEmit` |
| ルーティング | Vue Router 4 | `createWebHistory`、型付きのルート名 |
| 状態管理 | Pinia | setup store 形式で書く |
| Lint | ESLint 9（flat config） | `eslint-plugin-vue`（flat/recommended）＋ `@vue/eslint-config-typescript` |
| Format | Prettier | ESLint とは `@vue/eslint-config-prettier/skip-formatting` で役割を分ける |
| Unit テスト | Vitest ＋ @vue/test-utils ＋ happy-dom | テストファイルは `*.spec.ts` として対象ファイルの隣に置く |
| E2E（後日） | Playwright | 認証はモックで通す |
| 認証 | gapi.auth2（platform.js、継続） | 現行の OAuth クライアント ID を維持する。型は `@types/gapi.auth2` |
| ホスティング | Firebase Hosting（継続） | |
| Node | 最新 LTS | `.node-version` で固定する |

バージョンは着手時点の最新安定版を採用し、ロックファイルで固定する。

## ディレクトリ構成

機能ごとに縦割り（feature-based）にし、共通部品だけを `shared/` に置く。

```
/
├─ docs/                     設計ドキュメント
├─ public/                   アイコン・manifest（PWA 用）
├─ src/
│  ├─ app/                   起動と全体の配線だけを置く
│  │  ├─ main.ts
│  │  ├─ App.vue             レイアウト（ヘッダー + RouterView）
│  │  └─ router.ts           ルート定義と認証ガード
│  ├─ features/
│  │  ├─ auth/               ステップ 1 で実装
│  │  │  ├─ gapi-auth.ts         platform.js / gapi.auth2 のラッパー
│  │  │  ├─ auth-store.ts        Pinia: 状態・サインイン・トークン取得
│  │  │  ├─ SignInPage.vue
│  │  │  └─ *.spec.ts
│  │  ├─ drive/              Drive の一覧・検索（ステップ 2 以降）
│  │  ├─ playlist/           プレイリストと永続化
│  │  ├─ player/             再生制御（audio 要素を 1 つだけ持つ）
│  │  └─ tags/               ID3 タグの読み取りとキャッシュ
│  ├─ shared/
│  │  ├─ ui/                 汎用 UI（Button, Icon, Toast など）
│  │  ├─ lib/                純粋関数（時間・サイズの整形など）
│  │  └─ storage/            localStorage / IndexedDB のラッパー
│  └─ env.d.ts
├─ tests/e2e/                Playwright（後日）
├─ eslint.config.ts
├─ .prettierrc.json
├─ vite.config.ts
└─ vitest.config.ts
```

依存ルール:

- `features/*` は `shared/` を参照してよい。
- ある feature が別の feature を使うときは、相手の store か公開関数だけを通す。相手の内部ファイルは import しない。
- `shared/` は `features/` を参照しない。
- ESLint の import 制限ルールで機械的に守らせる。

## 状態設計（Pinia store）

| store | 持つ状態 | 主な操作 |
| --- | --- | --- |
| auth | status（`unknown` / `signedOut` / `signedIn`）、accessToken、expiresAt | `init()` `signIn()` `signOut()` `getValidToken()` |
| drive | 現在のフォルダ・検索語・一覧・nextPageToken | `open(folderId)` `search(word)` `loadMore()` |
| playlist | 曲の配列（唯一の正） | `add(fileOrFolder)` `remove(id)` `move(from, to)` `clear()` |
| player | 再生中の曲 ID、再生元のリスト、isPlaying、currentTime、duration、再生モード | `play(id, source)` `toggle()` `next()` `prev()` `seek(t)` |
| settings | 表示モード、タブ選択 | 変更したら永続化する |

- 永続化は `shared/storage` を通して store の中で行う。コンポーネントからは localStorage に触らない。
- Drive API の呼び出しは必ず `auth.getValidToken()` を通す。期限が近ければ `reloadAuthResponse()` で更新する。それでも 401 が返ったら、1 回だけ更新して再試行する。

## コンポーネント設計

```
App.vue
├─ AppHeader            タイトル・サインアウト
└─ RouterView
   ├─ SignInPage        サインインボタン
   └─ LibraryPage       /、/folders/:id、/search/:q
      ├─ PlayerBar      再生コントロール・シークバー（player store）
      ├─ DriveBrowser   検索欄 + 一覧 + 無限スクロール（drive store）
      │  └─ DriveItemRow
      └─ PlaylistPanel  並べ替え可能な一覧（playlist store）
         └─ PlaylistItemRow
```

- ページ（`*Page.vue`）は store とつなぐ役割だけを持つ。表示部品は props と emit だけで動くようにし、テストしやすくする。
- 兄弟コンポーネント間の `$refs` 呼び出しは禁止し、store を経由させる。
- 無限スクロールとトーストは小さな composable または自作部品で済ませる。並べ替えは SortableJS 系（着手時に選定）を使う。

## 決定事項

- 2026-09-30: 既存コードは踏襲せず作り直す。Vue 3.5、Vite、TypeScript、Pinia、ESLint 9 + Prettier、Vitest を採用する。
- 2026-09-30: ホスティングは Firebase Hosting のみ。サーバー側の処理（Cloud Functions、Supabase など）は持たない。カード登録なしの無料枠で運用する。リフレッシュトークンによる自動更新は見送り、iOS では保存済みトークンの再利用で対応する（[04](./04-ios-auth-persistence.md)）。
- 2026-09-30: 認証は現行の gapi.auth2 を継続する（実機で動作確認済み）。アプリ自身による localStorage の全消去を解消する（[04](./04-ios-auth-persistence.md)）。

- 2026-09-30: パッケージマネージャは npm、Node は 22、開発サーバーのポートは 8081、保存キーの接頭辞は `gdp:` とする。

## 未決事項

- 作り直しの進め方（同じリポジトリの新ブランチでルートを置き換える案が有力。旧版には `v1-vue2` タグを付ける）
- gapi.auth2 の停止が告知されたときの移行先（Google Identity Services）。停止日は未定で、告知は GCP プロジェクトの連絡先に届く
- タグ読み取りライブラリ（jsmediatags の個人フォークを継続するか、代替に移るか）
