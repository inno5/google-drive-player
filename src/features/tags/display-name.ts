import type { RawTags } from "./tag-types";

/** 曲名の表示モード */
export type DisplayMode = "titleArtist" | "full" | "fileName";

/** ボタンを押すたびに、この順で切り替わる */
export const DISPLAY_MODES: readonly DisplayMode[] = [
  "titleArtist",
  "full",
  "fileName",
];

export const DEFAULT_DISPLAY_MODE: DisplayMode = "titleArtist";

/** 切り替えたときのトースト・ボタンの説明に使う（現行版と同じ英語） */
export const DISPLAY_MODE_LABELS: Readonly<Record<DisplayMode, string>> = {
  titleArtist: "title - artist",
  full: "artist / album [track] - title",
  fileName: "file name",
};

export function isDisplayMode(value: unknown): value is DisplayMode {
  return DISPLAY_MODES.includes(value as DisplayMode);
}

export function nextDisplayMode(mode: DisplayMode): DisplayMode {
  const index = DISPLAY_MODES.indexOf(mode);
  return DISPLAY_MODES[(index + 1) % DISPLAY_MODES.length] ?? mode;
}

/** アーティストと曲名の両方がそろっているタグか（そろっていなければ、ファイル名を使う） */
export function hasArtistAndTitle(
  tags: Pick<RawTags, "artist" | "title"> | null | undefined,
): tags is Pick<RawTags, "artist" | "title"> {
  return !!tags && tags.artist !== "" && tags.title !== "";
}

/**
 * 表示する曲名を組み立てる。
 * アーティストか曲名のどちらかがなければ、どのモードでもファイル名にする。
 */
export function buildDisplayName(
  mode: DisplayMode,
  fileName: string,
  tags: RawTags | null | undefined,
): string {
  if (mode === "fileName" || !tags || !hasArtistAndTitle(tags)) {
    return fileName;
  }
  if (mode === "titleArtist") {
    return `${tags.title} - ${tags.artist}`;
  }
  let head = [tags.artist, tags.album]
    .filter((part) => part !== "")
    .join(" / ");
  if (tags.track !== "") {
    head += ` [${tags.track}]`;
  }
  return `${head} - ${tags.title}`;
}
