# docs

google-drive-player の設計・方針ドキュメント置き場。

| ファイル | 内容 |
| --- | --- |
| [01-current-analysis.md](./01-current-analysis.md) | 現行実装（Vue 2 版）の調査結果 |
| [02-rebuild-policy.md](./02-rebuild-policy.md) | 作り直しの方針・技術スタック・全体設計・コンポーネント設計 |
| [03-step1-foundation.md](./03-step1-foundation.md) | ステップ 1（基盤＋認証）の範囲・構成・完了条件 |
| [04-ios-auth-persistence.md](./04-ios-auth-persistence.md) | iOS「ホーム画面に追加」時の認証永続化の検証計画 |
| [05-step2-drive.md](./05-step2-drive.md) | ステップ 2（Drive の一覧・検索）の範囲・設計・完了条件 |
| [06-playlist.md](./06-playlist.md) | ステップ 3（プレイリスト）と、一覧画面全体（タブ切り替え・行の操作）の設計 |
| [07-player.md](./07-player.md) | ステップ 4（再生）の範囲・設計・完了条件 |
| [08-tags.md](./08-tags.md) | ステップ 5（タグと表示モード）の範囲・設計・完了条件 |

## 運用ルール

- ファイル名は `NN-kebab-case.md`。番号は追加順で、意味の優先度ではない。
- 決定事項は各ドキュメントの「決定事項」に日付つきで追記する。未決事項は「未決事項」に残す。
- 実装と食い違ったらドキュメントを直す（ドキュメントが正）。
