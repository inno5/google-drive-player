# 05. ステップ 2: Drive の一覧・検索

ステップ 2 のゴールは、サインイン後に Drive のフォルダをたどり、音声ファイルを名前で検索できるようにすること。プレイリスト・再生・タグはステップ 3 以降で扱う。

状態: **実装済み・未検証（2026-09-30）**

## 実装状況

- 実装済み: drive feature（`drive-api` / `drive-query` / `drive-store` / `DrivePanel` / `useInfiniteScroll`）、`shared/ui`（`TrackRow` / `SortableList`）、`shared/lib/format`、`features/library`（`LibraryPage` / `ViewTabs` / `view-store`）、ルート `/folders/:id` `/search/:q`、対応するテスト。
- 設計との差分:
  - 行のダブルクリックは `dblclick` ではなく、`click` の間隔（350ms 以内）で判定する（iOS で安定しないため）。
  - auth store に `refreshToken()`（強制取り直し）と `expire()`（signedOut にする）を追加した。drive-api の 401 再試行で使う。
  - 並べ替えは `reorder(items)`（配列ごと差し替え）にした。
  - プレイリスト側の列は、ステップ 3 までは「未実装」の表示だけを置いている。追加ボタンは無効。
  - 一覧をダブルクリックしたファイルの再生は、ステップ 4 まで何もしない。
- **未検証**: `npm install`（`vue-draggable-plus` を追加した）と `check` は未実行。`vue-draggable-plus` のバージョンと props（`delay-on-touch-only` など）は未確認。

## 範囲

| 含む | 含まない |
| --- | --- |
| Drive API のラッパー（一覧・検索・ページング・401 時の再試行） | プレイリストへの追加（行のボタンは置くが、ステップ 3 まで無効）。プレイリスト側の一覧 |
| drive store（現在のフォルダ・検索語・一覧・次ページ） | 再生（行クリックで再生するのはステップ 4） |
| DrivePanel（検索欄・一覧・無限スクロール）と、一覧画面の骨組み（[06](./06-playlist.md) の画面構成） | フォルダの再帰取得（プレイリストへの一括追加で使うため、ステップ 3） |
| ルート `/`、`/folders/:id`、`/search/:q` | ID3 タグの表示 |

## 引き継ぐ現行の仕様

- 表示対象は「フォルダ」と「`audio/*` のファイル」だけ。ゴミ箱は除く。
- 並び順はフォルダが先、その中で名前順（`orderBy: folder, name`）。
- 1 ページ 100 件。スクロールで次のページを読む。
- 検索は名前の部分一致（`name contains`）。Drive 全体が対象で、フォルダの中に限定しない。
- 行の表示と操作（番号・名前・サイズ・追加ボタン、ダブルクリックで開く、ドラッグで並べ替え）は [06](./06-playlist.md) の「2 つの一覧に共通する行の操作」に従う。
- 取得する項目は `id, name, size, mimeType, parents, modifiedTime`（`webContentLink` は使っていないので外す）。

## 現行から変えるところ

| 項目 | 現行 | 新しい実装 |
| --- | --- | --- |
| API の呼び方 | `gapi.client.drive.files.list` | `fetch` で REST を直接呼ぶ（`Authorization: Bearer`）。gapi.client に依存するのは auth の中だけになり、テストでは fetch を差し替えるだけで済む |
| トークン | 保持中のトークンをそのまま使う | 毎回 `auth.getValidToken()` を通す。401 なら 1 回だけ取り直して再試行し、それでも 401 ならサインイン画面へ |
| 検索語のエスケープ | `'` → `\` の順で置換（誤り） | `\` → `'` の順で置換する |
| 古い応答の扱い | `lastListRequest` との比較で捨てる | `AbortController` で前のリクエストを中止する |
| URL | `/d/:id`、`/search/:searchWord` | `/folders/:id`、`/search/:q`。旧 URL は扱わない（未知の URL としてホームへ） |
| 戻る操作 | 画面内の状態で管理 | URL が正。フォルダ移動・検索はすべてルーター経由にし、ブラウザの戻るで前の一覧に戻れる |

## 構成

```
src/features/drive/
├─ drive-api.ts          REST 呼び出し（Vue に依存しない）。listFolder / search / listChildren / getFile
├─ drive-query.ts        q 文字列の組み立てとエスケープ（純粋関数）
├─ drive-types.ts        DriveItem 型と isFolder()
├─ drive-store.ts        Pinia: 一覧の状態と操作
├─ DrivePanel.vue        検索欄 + 一覧（props / emit のみ）
├─ useInfiniteScroll.ts  IntersectionObserver で末尾に来たら emit
└─ index.ts
src/shared/lib/format.ts サイズ・日時の整形（旧 filters の置き換え）
```

- 行の部品（`TrackRow`）、並べ替え（`SortableList`）、画面全体（`LibraryPage`）は [06](./06-playlist.md) の構成に置く。
- `listChildren(parentIds)` はプレイリストへのフォルダ追加（ステップ 3）で使う。

依存の向き: `LibraryPage → drive-store → drive-api → auth（getValidToken）`。drive-api は auth の公開 API（`index.ts`）だけを使う。

## drive store

| 状態 | 内容 |
| --- | --- |
| `mode` | `folder` / `search` |
| `folderId` | 表示中のフォルダ（ルートは `root`） |
| `query` | 検索語 |
| `items` | 表示中の一覧（ドラッグで並べ替えた順） |
| `nextPageToken` | 次ページのトークン。なければ末尾 |
| `status` | `idle` / `loading` / `error` |

| 操作 | 内容 |
| --- | --- |
| `openFolder(id)` | 前のリクエストを中止し、一覧を空にして 1 ページ目を読む |
| `search(q)` | 同上（検索） |
| `loadMore()` | `nextPageToken` があり、読み込み中でなければ次ページを末尾に追加する |
| `reorder(items)` | ドラッグで並べ替えた結果を反映する（保存しない） |
| `retry()` | エラー後に同じ条件で読み直す |

- 一覧は永続化しない（毎回 API から読む）。

## 画面（DrivePanel）

```
DrivePanel
├─ 検索欄       Enter で /search/:q へ。空で確定すると / へ（IME 変換中の Enter は無視）
├─ 一覧         TrackRow × n。フォルダをダブルクリックで /folders/:id へ
└─ 末尾         読み込み中 / さらに読む（自動）/ エラーと再試行ボタン / 0 件表示
```

- 現行と同じくパンくずは置かない。上の階層へはブラウザの戻る、またはヘッダーのタイトル（ルートへ）で移動する。
- DrivePanel は高さを親に任せ、自分の中だけでスクロールする（プレイリストと左右に並ぶため）。

## エラーの扱い

| 状況 | 表示 |
| --- | --- |
| 401（再試行後も） | auth を signedOut にし、サインイン画面へ（`AuthExpiredError`） |
| 403 / 429 | 「一時的に取得できません」と再試行ボタン |
| ネットワークエラー | 同上 |
| 中止（AbortError） | 何もしない |

## テスト

| 種類 | 対象 |
| --- | --- |
| Unit | drive-query（エスケープ、フォルダ / 検索の q 文字列） |
| Unit | drive-api（URL とパラメータ、Bearer ヘッダー、401 → 1 回だけ再試行、2 回目の 401 で AuthExpiredError、中止）。fetch をモックする |
| Unit | drive store（openFolder / search / loadMore / reorder / 古い応答を捨てる / エラー → retry） |
| Component | DrivePanel（検索の確定で emit、IME 変換中の Enter を無視、状態ごとの末尾表示） |
| Unit | ルーター（`/folders/:id` と `/search/:q` の認証ガード） |
| 手動 | Mac Chrome: フォルダの移動、戻る、検索、100 件を超えるフォルダのスクロール、1 時間後の再取得 |

## 完了条件

- [ ] `check` がエラー 0・警告 0 で通る
- [ ] フォルダをたどり、ブラウザの戻るで前の一覧に戻れる
- [ ] 検索で `'` や `\` を含む名前も見つかる
- [ ] 100 件を超えるフォルダで、スクロールすると続きが読み込まれる
- [ ] トークン期限切れ後の操作で、再取得かサインイン画面への遷移のどちらかになる（「取得できません」で止まらない）

## 決定事項

- 2026-09-30: パンくずは置かない（現行どおり）。行の表示項目と操作は現行どおり（[06](./06-playlist.md)）。
- 2026-09-30: Drive API は gapi.client ではなく fetch で REST を直接呼ぶ。
- 2026-09-30: 旧 URL（`/d/:id`、`/search/:searchWord`）は考慮しない（現行データを引き継がないのと同じ考え）。
