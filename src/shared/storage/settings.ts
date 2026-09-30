import { readJson, writeJson } from "./safe-storage";

/** 設定（表示・再生モードなど）を 1 つのキーにまとめて保存する */
export const SETTINGS_STORAGE_KEY = "gdp:settings";
const SETTINGS_VERSION = 1;

export type Settings = Record<string, unknown>;

export function loadSettings(): Settings {
  const data = readJson<Settings>(SETTINGS_STORAGE_KEY);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {};
  }
  return data;
}

/** 指定した項目だけを更新する（他の項目は残す）。保存できたら true */
export function patchSettings(patch: Settings): boolean {
  return writeJson(SETTINGS_STORAGE_KEY, {
    ...loadSettings(),
    ...patch,
    version: SETTINGS_VERSION,
  });
}
