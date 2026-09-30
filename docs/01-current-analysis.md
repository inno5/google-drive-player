# 01. 現行実装の調査結果（Vue 2 版）

調査日: 2026-09-30 / 対象: `package.json` v1.2.6（コミット a43ccca）

## 要約

- ソースは約 30 ファイル。画面 2・コンポーネント 3・サービス 3・状態 1 の小規模構成。
- 最大のリスクは Vue ではなく認証。廃止済みの Google Sign-In ライブラリ（`gapi.auth2` / `gapi.signin2`）に全面依存している。
- 状態の一部（audioService の配列）は Vue 2 固有の配列監視の副作用で画面に反映されており、Vue 3 ではそのままでは動かない。
- 以上から、移行ではなく作り直しを選ぶ（[02](./02-rebuild-policy.md)）。

## 構成と依存関係

```
main.ts ── authService.init() 完了後に mount / プラグイン・フィルタを全体登録
├─ router.ts   / , /d/:id , /search/:searchWord → MainPage、/signin → SignInPage、* → /signin
│              beforeEach で appState.isSignedIn を参照
└─ App.vue     isSignedIn を watch して / か /signin へ push
   ├─ AppHeader.vue   サインアウト・バージョン表示 → authService, appState
   ├─ SignInPage.vue  gapi.signin2 でボタン描画 → authService
   └─ MainPage.vue    $refs で子を直接呼ぶ（clickRow → audioPlayer.play()）
      ├─ AudioPlayer.vue  fetch(alt=media) → Blob URL → audio 要素 → appState, audioService, authService
      └─ FileList.vue     Drive 一覧 + プレイリスト → audioService の配列を data に直接代入

services/state:
  authService   gapi.client.init / token 保持 / 未サインイン判定時に localStorage.clear()
  audioService  driveList / playList / タグ読込キュー（素のクラス）→ gapi, jsmediatags, authService, appState, util
  appState      Vue.observable(new AppState())。サインイン・タブ・再生モード・playId
  util          isPC / isFolder / getDispText（localStorage を直読み）。audioService と循環 import
外部: gapi.auth2（廃止済）, Drive API v3, jsmediatags（個人フォーク）, localStorage
```

## 領域別の所見

| 領域 | 現状 | 問題点 |
| --- | --- | --- |
| Vue 2 依存 | vue 2.6、vue-class-component / vue-property-decorator（全コンポーネント）、vue-router 3、vue-infinite-loading、vuedraggable 2、vue-toasted、v-tooltip 2、フィルタ構文、Vue CLI 4.5 / webpack 4 / node-sass 4 / Node 14 | プラグイン 4 種が Vue 3 非対応。Class API は Vue 3 で非推奨。ビルド環境が古く、最新の Node では動かない |
| 状態管理 | `appState`（Vue.observable）と `audioService`（素のクラス）の 2 つのシングルトン | audioService の配列は暗黙のリアクティビティ。`splice(0, 0)` で強制的に再描画している。util と audioService が循環 import している |
| 認証 | platform.js → `gapi.client.init({ scope: drive.readonly })`、`isSignedIn.listen` | 2023-03-31 に廃止済み。`plugin_name` を設定していない。トークンを更新しないため 1 時間後に 401 になる見込み。未サインインと判定すると localStorage を全消去する |
| Drive API | `files.list`（100 件ページング、フォルダ再帰は 1000 件 × 50 フォルダずつ）、`alt=media` を Bearer 付きで fetch | 検索語のエスケープ順序が逆（`'` → `\` の順で置換している） |
| 音声再生 | 曲全体を fetch → Blob URL → audio 要素。`loadeddata` で自動再生 | Blob URL を解放しない。大きいファイルほど開始が遅い。検索欄で Space を押すと再生と停止が切り替わる。`findIndex() \|\| 0` で -1 を扱えていない |
| ルーティング | history モード。Firebase Hosting の `** → /index.html` | ガードが name の前方一致で判定し、App.vue の watch とも二重管理になっている |

## 現行版にある不具合（コードから推定、実機では未確認）

- vuedraggable 2 は `v-model` に新しい配列を emit する。そのためドラッグ後は画面の配列とサービス側の配列が分離し、次の曲が並べ替え前の順番で選ばれる。
- アクセストークンが約 1 時間で失効すると、再生が「このファイルは再生できません」になる。
- iOS のホーム画面アプリで起動すると gapi.auth2 がセッションを復元できず、未サインインと判定される。その判定を受けて `localStorage.clear()` が走るため、保存データが消える可能性がある（→ [04](./04-ios-auth-persistence.md) の仮説 H1）。

## 参考

- [Google Sign-In JavaScript — Deprecation and Sunset](https://developers.google.com/identity/sign-in/web/deprecation-and-sunset)
- [Migrate to Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/migration-to-gis)
