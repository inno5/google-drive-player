import type { DownloadOptions, DriveApi } from "@/features/drive";

/** 取得した曲の Blob URL。使い終わったら revoke() で解放する（2 回呼んでも安全） */
export interface LoadedMedia {
  url: string;
  revoke(): void;
}

export interface LoadOptions {
  signal?: AbortSignal;
  /** 取得した割合（0〜1） */
  onProgress?: (ratio: number) => void;
}

export interface ObjectUrls {
  create(blob: Blob): string;
  revoke(url: string): void;
}

const browserUrls: ObjectUrls = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => {
    URL.revokeObjectURL(url);
  },
};

/**
 * Drive から曲の中身を取得して Blob URL にする。
 * 前の曲の URL の解放は、新しい曲を <audio> に渡したあとに呼び出し側が行う
 * （再生中の URL を先に解放しないため）。
 */
export async function loadMedia(
  api: Pick<DriveApi, "downloadFile">,
  item: { id: string; mimeType: string },
  options: LoadOptions = {},
  urls: ObjectUrls = browserUrls,
): Promise<LoadedMedia> {
  const downloadOptions: DownloadOptions = {
    signal: options.signal,
    onProgress: options.onProgress,
    mimeType: item.mimeType,
  };
  const blob = await api.downloadFile(item.id, downloadOptions);
  const url = urls.create(blob);
  let revoked = false;
  return {
    url,
    revoke() {
      if (!revoked) {
        revoked = true;
        urls.revoke(url);
      }
    },
  };
}
