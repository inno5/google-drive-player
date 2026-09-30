import { isFolder, type DriveItem } from "@/features/drive";
import type { PlaySource } from "@/features/player";

/**
 * 再生元ごとの「今の曲の一覧」を返す関数を作る。
 * フォルダは飛ばし、音声ファイルだけを返す。並べ替え後の順序のまま。
 */
export function createGetItems(lists: {
  drive: () => readonly DriveItem[];
  playlist: () => readonly DriveItem[];
}): (source: PlaySource) => DriveItem[] {
  return (source) => lists[source]().filter((item) => !isFolder(item));
}
