import { readJson, writeJson } from "@/shared/storage/safe-storage";
import type { TrackTags } from "./tag-types";

export const TAGS_STORAGE_KEY = "gdp:tags";
const TAGS_VERSION = 1;

interface StoredTags {
  version: number;
  tags: Record<string, unknown>;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toTrackTags(value: unknown): TrackTags | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.modifiedTime !== "string") {
    return null;
  }
  return {
    modifiedTime: raw.modifiedTime,
    artist: toText(raw.artist),
    title: toText(raw.title),
    album: toText(raw.album),
    track: toText(raw.track),
  };
}

/** 保存されたタグを読む。壊れたデータ・不正な項目は無視する */
export function loadTags(): Record<string, TrackTags> {
  const data = readJson<StoredTags>(TAGS_STORAGE_KEY);
  if (
    typeof data !== "object" ||
    data === null ||
    data.version !== TAGS_VERSION ||
    typeof data.tags !== "object" ||
    data.tags === null ||
    Array.isArray(data.tags)
  ) {
    return {};
  }
  const result: Record<string, TrackTags> = {};
  for (const [id, value] of Object.entries(data.tags)) {
    const tags = toTrackTags(value);
    if (id !== "" && tags) {
      result[id] = tags;
    }
  }
  return result;
}

/** 保存できたら true */
export function saveTags(tags: Readonly<Record<string, TrackTags>>): boolean {
  return writeJson(TAGS_STORAGE_KEY, { version: TAGS_VERSION, tags });
}
