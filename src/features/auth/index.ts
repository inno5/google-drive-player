/** auth feature の公開 API。他の feature / app は、ここ経由でだけ使う */
export { useAuthStore } from "./auth-store";
export { createGapiAuthClient } from "./gapi-auth";
export type { AuthClient, AuthSnapshot, AuthStatus } from "./auth-client";
export { AuthExpiredError, AuthRequiredError } from "./errors";
export { AUTH_TOKEN_STORAGE_KEY } from "./token-storage";
export { default as SignInPage } from "./SignInPage.vue";
