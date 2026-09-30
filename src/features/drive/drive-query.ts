import { FOLDER_MIME_TYPE } from "./drive-types";

/** 一覧に出すのはフォルダと音声ファイル（ゴミ箱は除く） */
const TARGET = `(mimeType = '${FOLDER_MIME_TYPE}' or mimeType contains 'audio/') and trashed = false`;

/**
 * q の文字列リテラルに入れる値のエスケープ。\ と ' の前に \ を付ける。
 * 1 回の置換で行う（\ → ' の順に 2 回置換すると、付けた \ を二重にエスケープしてしまう）。
 * lib が ES2020 のため replaceAll は使わない。
 */
export function escapeQueryValue(value: string): string {
  return value.replace(/[\\']/g, "\\$&");
}

export function folderQuery(folderId: string): string {
  return `${TARGET} and '${escapeQueryValue(folderId)}' in parents`;
}

export function searchQuery(word: string): string {
  return `${TARGET} and name contains '${escapeQueryValue(word)}'`;
}

/** 複数のフォルダ直下をまとめて取得する q（親は 1 つ以上） */
export function childrenQuery(parentIds: readonly string[]): string {
  const parents = parentIds
    .map((id) => `'${escapeQueryValue(id)}' in parents`)
    .join(" or ");
  return `${TARGET} and (${parents})`;
}
