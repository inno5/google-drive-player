export interface AppConfig {
  googleClientId: string;
  googleApiKey: string;
}

type EnvLike = Partial<Record<string, string | undefined>>;

/** 必須の環境変数を検証して返す。足りなければ何が必要かを示して例外にする。 */
export function readConfig(env: EnvLike = import.meta.env): AppConfig {
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID?.trim();
  const googleApiKey = env.VITE_GOOGLE_API_KEY?.trim();
  const missing: string[] = [];
  if (!googleClientId) missing.push("VITE_GOOGLE_CLIENT_ID");
  if (!googleApiKey) missing.push("VITE_GOOGLE_API_KEY");
  if (missing.length > 0 || !googleClientId || !googleApiKey) {
    throw new Error(
      `環境変数が未設定です: ${missing.join(", ")}（.env.local / .env.production を確認してください）`,
    );
  }
  return { googleClientId, googleApiKey };
}
