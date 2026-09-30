export const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
/** マイドライブのルートを表す Drive API の別名 */
export const ROOT_FOLDER_ID = "root";

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  /** バイト数。フォルダなど不明なら null */
  size: number | null;
  modifiedTime: string;
  parents: string[];
}

export function isFolder(item: Pick<DriveItem, "mimeType">): boolean {
  return item.mimeType === FOLDER_MIME_TYPE;
}
