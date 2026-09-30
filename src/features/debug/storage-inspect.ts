import { listKeys, safeGetItem } from "@/shared/storage/safe-storage";

export interface StorageEntry {
  key: string;
  /** 値の文字数 */
  length: number;
  /** 値を表示してはいけないキー（トークンなど） */
  hidden: boolean;
  /** 表示用の値（先頭部分）。hidden のときは空 */
  preview: string;
}

const PREVIEW_LENGTH = 80;

/** localStorage の中身を一覧にする。hiddenKeys の値は表示しない */
export function inspectStorage(hiddenKeys: string[] = []): StorageEntry[] {
  return listKeys()
    .sort()
    .map((key) => {
      const value = safeGetItem(key) ?? "";
      const hidden = hiddenKeys.includes(key);
      return {
        key,
        length: value.length,
        hidden,
        preview: hidden ? "" : value.slice(0, PREVIEW_LENGTH),
      };
    });
}
