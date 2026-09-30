/** 曲から読み取ったタグ。空文字は「ない」ことを表す */
export interface RawTags {
  artist: string;
  title: string;
  album: string;
  /** タグの値のまま（`3` や `3/12`） */
  track: string;
}

/** 保存するタグ。読み取ったときの更新日時も持つ */
export interface TrackTags extends RawTags {
  /** 読み取ったときの Drive 上の更新日時。変わったら読み直す */
  modifiedTime: string;
}

/**
 * タグの読み取り結果。
 * - ok: 読めた
 * - none: ファイルにタグがない（対応しない形式を含む）。読み直しても結果は同じ
 * - failed: 通信・認証などのエラー。読み直せば読めるかもしれない
 */
export type ReadOutcome =
  { status: "ok"; tags: RawTags } | { status: "none" } | { status: "failed" };

/** タグの読み取りの対象にする曲（プレイリストの曲） */
export interface TagTarget {
  id: string;
  name: string;
  modifiedTime: string;
}

export const EMPTY_TAGS: RawTags = {
  artist: "",
  title: "",
  album: "",
  track: "",
};
