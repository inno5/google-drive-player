# google-drive-player

Google Drive 内の音楽を再生する Web アプリ（Vue 3.5 + Vite + TypeScript + Pinia）。
設計・方針は [docs/](./docs/README.md) を参照。

現行版（Vue 2）の機能はひととおり実装済み（ステップ 1〜5: 認証、Drive の一覧・検索、プレイリスト、再生、タグと表示モード）。
現行版との差分は [docs/09](./docs/09-remaining-diffs.md) を参照。

新機能として、耳コピ用の**練習ビュー**（ヘッダーの耳アイコン。ピッチ・速度の独立変更、波形つき 10 段シークバー）がある。仕様と方式は [docs/10](./docs/10-practice-mode.md) を参照。

## セットアップ

Node 22 が必要（`.node-version`）。

```sh
npm install
```

`.env.example` を参考に、`.env.local`（開発）と `.env.production`（本番ビルド）を作り、次を設定する。どちらも git 管理外。

```
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_API_KEY=...
```

OAuth クライアント ID は現行のものを使い続けること（gapi.auth2 は 2022-07-29 以降に作られた ID では動かない）。
承認済み JavaScript 生成元に `http://localhost:8081`、本番 URL、プレビューチャンネルの URL を登録しておく。

## スクリプト

| script | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー（http://localhost:8081） |
| `npm run build` | 型チェック + 本番ビルド（`dist/`） |
| `npm run preview` | ビルド結果の確認（8081） |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run typecheck` | vue-tsc |
| `npm test` / `test:watch` | Vitest |
| `npm run check` | lint + format:check + typecheck + test |
| `npm run deploy:preview` | check + build + Firebase プレビューチャンネルへデプロイ |
| `npm run deploy` | check + build + Firebase Hosting 本番へデプロイ |

## デバッグ

`/debug` で、起動ごとの認証状態の履歴と localStorage の中身を確認できる（iOS 検証用。[docs/04](./docs/04-ios-auth-persistence.md)）。
