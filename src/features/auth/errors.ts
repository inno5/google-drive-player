/** サインインしていない状態でトークンを求められた */
export class AuthRequiredError extends Error {
  constructor() {
    super("サインインが必要です");
    this.name = "AuthRequiredError";
  }
}

/** トークンの有効期限が切れていて、更新もできなかった */
export class AuthExpiredError extends Error {
  constructor() {
    super("ログインの有効期限が切れました。もう一度サインインしてください");
    this.name = "AuthExpiredError";
  }
}
