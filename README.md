# google-drive-player

動作させるには google cloud platform (GCP) の API key と OAUTH2 client id が必要です。

以下のファイルに GCP API key と GCP OAUTH2 client id を記述してください。
env/.env.local.ts
env/.env.prod.ts

記述が終わったらファイル名先頭の . を削除してください。
以下のようになれば準備完了です。
env/env.local.ts
env/env.prod.ts

yarn serve
local 用の env でローカルサーバが起動します。

yarn deploy
prod 用の env で firebase deploy が実行されます。
（このコマンドを使用する場合はまず firebase init を実行して firebase hosting の初期化を行なってください。）

https://firebase.google.com/docs/cli

favicon
https://realfavicongenerator.net/

icon
https://fonts.google.com/icons?selected=Material+Icons

## Project setup

```
yarn install
```

### Compiles and hot-reloads for development

```
yarn serve
```

### Compiles and minifies for production

```
yarn build
```

### Lints and fixes files

```
yarn lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).
