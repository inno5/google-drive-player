# 06. プレイリスト（ステップ 3）と一覧画面の全体設計

ドライブ内の一覧（[05](./05-step2-drive.md)）とプレイリストは同じ画面に並ぶため、画面の構成と 2 つの一覧に共通する操作をここで決める。プレイリスト自体の実装はステップ 3 で行う。

状態: **プレイリストは実装済み・未検証（2026-09-30）**

## 実装状況

- 実装済み（ステップ 3）: `features/playlist`（`playlist-store` / `playlist-storage` / `folder-collector` / `PlaylistPanel`）、`shared/ui` のトースト（`AppToast` / `useToast`）、LibraryPage での接続（追加・削除・並べ替え・Remove All・追加中の表示とキャンセル）、対応するテスト。
- 設計との差分:
  - フォルダの中身は「フォルダ直下 → サブフォルダ（深さ優先）」の順に、兄弟のフォルダ 50 個ずつをまとめて取得する。500 曲に達したらそれ以降は取得しない。
  - 依存の向きは playlist → drive（`listChildren` と型を使う）。drive は playlist を import しない。追加の配線は LibraryPage が行う。
  - フォルダ追加中に別のフォルダを追加しようとすると「フォルダを追加中です」と知らせる（ファイルは追加できる）。
  - 中身に音声ファイルがないフォルダは、何も追加せず知らせる。
- 未実装: 再生（ステップ 4）、表示名のタグ反映（ステップ 5。今はファイル名を表示）。
- **未検証**: `check` は未実行。並び順のロジック（`folder-collector`）は Node で動作を確認した。

## 画面構成（現行と同じ）

```
LibraryPage
├─ PlayerBar          再生コントロール（ステップ 4）
├─ ViewTabs           [ Google Drive ] [ Playlist ]
└─ 一覧エリア
   ├─ DrivePanel      検索欄 + ドライブ内一覧（05）
   └─ PlaylistPanel   Remove All + プレイリスト
```

### 表示の切り替え

表示は `both`（左右 2 列）、`drive`、`playlist` の 3 状態。タブを押したときの動きは現行と同じにする。

| 今の表示 | Drive タブを押す | Playlist タブを押す |
| --- | --- | --- |
| both | drive | playlist |
| drive | both | playlist |
| playlist | drive | both |

- 押したタブが単独表示中ならば両方表示に戻り、それ以外ならそのタブだけの表示になる。
- `both` では PC・スマートフォンとも左右 2 列にする（現行どおり）。各列の中身は `960px / 2` を上限に、画面中央へ寄せる。
- 選んだ表示は保存して、次回の起動時に復元する。初期値は `both`。
- 表示の切り替えで一覧の状態（スクロール位置・読み込み済みのページ）は失わない（`v-show` で隠すだけにする）。

## 2 つの一覧に共通する行の操作（現行と同じ）

| 操作 | ドライブ内一覧 | プレイリスト |
| --- | --- | --- |
| ダブルクリック（タップ 2 回） | フォルダなら開く、ファイルなら再生 | 再生 |
| 行末のボタン | プレイリストに追加（フォルダは中身をまとめて追加） | プレイリストから削除 |
| ドラッグ | 並べ替え（保存しない。再生順にだけ影響する） | 並べ替え（保存する） |
| 表示内容 | 番号・アイコン・名前・サイズ | 番号・アイコン・表示名（タグ）・サイズ |
| 再生中の曲 | 行を強調表示 | 行を強調表示 |

- 行はどちらも同じ `TrackRow` 部品を使い、違い（行末ボタンの種類・表示名）は props で渡す。
- ドラッグには SortableJS の Vue 3 用ラッパー `vue-draggable-plus` を使う。タッチ端末では現行と同じく長押し 100ms で掴む（`delayOnTouchOnly`）。スクロールと誤認しないため。
- ドライブ内一覧の並べ替えは、読み込み済みの範囲でだけ有効。フォルダ移動・検索・次ページの読み込みでは Drive の順序に戻さず、新しく読んだ行を末尾に足すだけにする。
- 番号は 1 始まりにする（現行は 0 始まり）。

### どちらの一覧から再生しているか

現行と同じく、最後にダブルクリックした一覧を「再生元」とし、次の曲・前の曲・シャッフルはその一覧の（並べ替え後の）順序に従う。player store（ステップ 4）は `source: "drive" | "playlist"` を持ち、曲順は各 store から読む（詳細は [07](./07-player.md) の「再生元の一覧」）。プレイリストの曲を削除・並べ替えしても、再生中の曲はそのまま続ける。

## プレイリストの仕様

| 操作 | 内容 |
| --- | --- |
| ファイルを追加 | 末尾に追加する。同じ ID がすでにあれば、位置はそのままで名前やサイズなどの情報だけを更新する（現行どおり） |
| フォルダを追加 | サブフォルダを含む音声ファイルをすべて取得し、下の順序で末尾に追加する。重複の扱いはファイルと同じ |
| 削除 | 1 曲ずつ削除する |
| Remove All | すべて削除する。確認ダイアログは出さない（現行どおり） |
| 並べ替え | ドラッグで移動し、すぐ保存する |

### フォルダを追加するときの順序（フォルダ順 → 名前順）

エクスプローラーでフォルダを展開した順にする。

```
追加したフォルダ/
├─ 01 intro.mp3        ← 1
├─ 2 song.mp3          ← 2
├─ 10 outro.mp3        ← 3（名前は自然順: 1, 2, 10）
├─ Disc 1/             ← 4〜（サブフォルダは直下のファイルの後、名前の自然順）
│  └─ …
└─ Disc 2/
   └─ …
```

- 名前の比較は `Intl.Collator(undefined, { numeric: true, sensitivity: "base" })` で行う（「2」が「10」より前に来る）。

### フォルダの中身の取得

- 親フォルダの ID を最大 50 個ずつ `'a' in parents or 'b' in parents …` にまとめて `files.list`（pageSize 1000）を呼ぶ。深さごとに順に進める（幅優先）。
- `nextPageToken` を最後まで追う（現行は 1000 件で打ち切られていた）。
- 上限: 1 回の追加で 500 曲、深さ 10 段。超えたら上限までを追加し、その旨をトーストで伝える。
- 取得中は一覧の上に「追加中… n 曲」を表示し、キャンセルできるようにする（現行はスピナーのみ）。
- 途中でエラーになったら何も追加しない（中途半端な追加をしない）。

## 保存

| キー | 内容 |
| --- | --- |
| `gdp:playlist` | `{ version: 1, items: PlaylistItem[] }` |
| `gdp:settings` | `{ version: 1, view: "both" \| "drive" \| "playlist", displayMode, playMode }`（`view` はステップ 2 で実装済み。`shared/storage/settings.ts` の `patchSettings` で、他の項目を残したまま更新する。displayMode・playMode はステップ 4〜5 で使う） |

```ts
interface PlaylistItem {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  parents: string[];
}
```

- タグ（アーティスト・曲名など）はプレイリストに持たせず、tags feature のキャッシュ（ステップ 5）に分ける。プレイリストの表示名は、タグがあればタグから、なければファイル名で作る。
- 保存は `shared/storage` を通す。書き込みに失敗した（容量超過など）ときはトーストで伝え、画面上の状態はそのまま残す。
- 1 曲あたり約 250 バイトなので、localStorage の上限（約 5MB）でも 1 万曲程度まで入る。

### 現行版のデータ

現行版の保存データ（`ls-key-*`）は引き継がない。新しい版は `gdp:` のキーだけを使い、旧キーには触らない（読まない・消さない）。

## 構成

```
src/features/playlist/
├─ playlist-store.ts     Pinia: items、add / addFolder / remove / move / clear、保存
├─ playlist-storage.ts   読み書きと形式の検証
├─ folder-collector.ts   フォルダの中身を再帰的に集めて並べる（drive の公開 API を使う。drive は playlist を import しない）
├─ PlaylistPanel.vue     Remove All + 一覧
└─ index.ts
src/features/library/
├─ LibraryPage.vue       ルートと store をつなぐ。DrivePanel / PlaylistPanel / ViewTabs を並べる
├─ ViewTabs.vue
└─ view-store.ts         表示の切り替えと保存（settings の一部）
src/shared/ui/
├─ TrackRow.vue          一覧の 1 行（両方の一覧で使う）
├─ SortableList.vue      vue-draggable-plus の薄いラッパー
└─ AppToast.vue / useToast.ts
```

- `features/library/` はステップ 2 で作り（DrivePanel だけを置く）、ステップ 3 で PlaylistPanel を加える。drive と playlist の両方を並べるため、どちらの feature にも属さない。
- 「追加」ボタンは drive の行にあるが、処理は playlist store が持つ。LibraryPage が drive の行の `add` イベントを受けて playlist store を呼ぶ（drive と playlist は互いを import しない）。

## テスト

| 種類 | 対象 |
| --- | --- |
| Unit | playlist store（追加・重複時の更新・削除・並べ替え・全削除・保存・保存失敗） |
| Unit | folder-collector（順序、50 件ずつのまとめ、nextPageToken の追跡、上限、途中エラーで何も返さない、キャンセル） |
| Unit | playlist-storage（壊れたデータ・古い形式を読んでも落ちない） |
| Unit | view-store（タブの切り替え表、保存と復元） |
| Component | TrackRow（ダブルクリックで emit、ボタンで emit、再生中の強調、1 始まりの番号）、ViewTabs、PlaylistPanel（空のとき「No data」、Remove All） |
| 手動 | Mac Chrome: ドラッグでの並べ替え、500 曲を超えるフォルダの追加（上限で止まる）、リロード後の復元 |

## 完了条件

- [ ] `check` がエラー 0・警告 0 で通る
- [ ] タブの切り替えが現行と同じように動き、リロード後も表示が保たれる
- [ ] ファイル・フォルダを追加でき、フォルダは「フォルダ順 → 名前順」で並ぶ
- [ ] プレイリストをドラッグで並べ替え、リロード後も順序が保たれる
- [ ] 500 曲・10 段を超えるフォルダは上限までを追加し、その旨が表示される

## 決定事項

- 2026-09-30: 表示の切り替え（タブ・両方表示）は現行と同じ。スマートフォンでも 2 列表示を残す。
- 2026-09-30: ドライブ内一覧のドラッグによる並べ替えは残す（保存はしない）。
- 2026-09-30: 行の操作は現行どおりダブルクリック。
- 2026-09-30: フォルダ追加時の順序は「フォルダ順 → 名前順（自然順）」。
- 2026-09-30: Remove All に確認ダイアログは付けない。
- 2026-09-30: フォルダ追加の上限は 500 曲・深さ 10 段。
- 2026-09-30: 番号は 1 始まり。
- 2026-09-30: 現行版の保存データは引き継がない。
