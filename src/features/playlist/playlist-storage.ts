import type { DriveItem } from "@/features/drive";
import { readJson, writeJson } from "@/shared/storage/safe-storage";

/** プレイリストの 1 曲。Drive のファイル情報をそのまま持つ */
export type PlaylistItem = DriveItem;

export const PLAYLIST_STORAGE_KEY = "gdp:playlist";
const PLAYLIST_VERSION = 1;

interface StoredPlaylist {
  version: number;
  items: unknown[];
}

function toItem(value: unknown): PlaylistItem | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    raw.id === "" ||
    typeof raw.name !== "string" ||
    typeof raw.mimeType !== "string"
  ) {
    return null;
  }
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    size: typeof raw.size === "number" ? raw.size : null,
    modifiedTime: typeof raw.modifiedTime === "string" ? raw.modifiedTime : "",
    parents: Array.isArray(raw.parents)
      ? raw.parents.filter((p): p is string => typeof p === "string")
      : [],
  };
}

/** 保存されたプレイリストを読む。壊れたデータ・不正な曲は無視する */
export function loadPlaylist(): PlaylistItem[] {
  const data = readJson<StoredPlaylist>(PLAYLIST_STORAGE_KEY);
  if (
    typeof data !== "object" ||
    data === null ||
    data.version !== PLAYLIST_VERSION ||
    !Array.isArray(data.items)
  ) {
    return [];
  }
  const seen = new Set<string>();
  const items: PlaylistItem[] = [];
  for (const value of data.items) {
    const item = toItem(value);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

/** 保存できたら true（容量超過などで失敗したら false） */
export function savePlaylist(items: readonly PlaylistItem[]): boolean {
  return writeJson(PLAYLIST_STORAGE_KEY, {
    version: PLAYLIST_VERSION,
    items,
  });
}
