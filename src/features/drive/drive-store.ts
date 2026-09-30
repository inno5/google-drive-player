import { ref } from "vue";
import { defineStore } from "pinia";
import { AuthExpiredError, useAuthStore } from "@/features/auth";
import { createDriveApi, type DriveApi } from "./drive-api";
import { ROOT_FOLDER_ID, type DriveItem } from "./drive-types";

export type DriveMode = "folder" | "search";
export type DriveStatus = "idle" | "loading" | "error";

/**
 * ドライブ内の一覧（フォルダの中身 or 検索結果）の状態。
 * 表示条件が変わると、進行中のリクエストは中止して一覧を読み直す。
 */
export const useDriveStore = defineStore("drive", () => {
  const mode = ref<DriveMode>("folder");
  const folderId = ref(ROOT_FOLDER_ID);
  const query = ref("");
  const items = ref<DriveItem[]>([]);
  const nextPageToken = ref<string | null>(null);
  const status = ref<DriveStatus>("idle");
  const error = ref<string | null>(null);
  /** 最初のページを読み終えたか（0 件表示の判定用） */
  const hasLoaded = ref(false);

  let api: DriveApi | null = null;
  let controller: AbortController | null = null;

  /** テストで API を差し替えるためのもの */
  function setApi(next: DriveApi): void {
    api = next;
  }

  function getApi(): DriveApi {
    if (!api) {
      api = createDriveApi(useAuthStore());
    }
    return api;
  }

  async function load(reset: boolean): Promise<void> {
    controller?.abort();
    const current = new AbortController();
    controller = current;

    if (reset) {
      items.value = [];
      nextPageToken.value = null;
      hasLoaded.value = false;
    }
    status.value = "loading";
    error.value = null;

    const options = {
      pageToken: reset ? null : nextPageToken.value,
      signal: current.signal,
    };
    try {
      const page =
        mode.value === "search"
          ? await getApi().search(query.value, options)
          : await getApi().listFolder(folderId.value, options);
      if (current.signal.aborted) {
        return;
      }
      items.value = [...items.value, ...page.items];
      nextPageToken.value = page.nextPageToken;
      hasLoaded.value = true;
      status.value = "idle";
    } catch (e) {
      if (current.signal.aborted) {
        return;
      }
      if (e instanceof AuthExpiredError) {
        // サインイン画面への切り替えは、認証状態の変化を受けたルーターが行う
        status.value = "idle";
        return;
      }
      status.value = "error";
      error.value = e instanceof Error ? e.message : String(e);
    }
  }

  function openFolder(id: string): Promise<void> {
    mode.value = "folder";
    folderId.value = id;
    query.value = "";
    return load(true);
  }

  function search(word: string): Promise<void> {
    mode.value = "search";
    query.value = word;
    return load(true);
  }

  /** 次のページを末尾に追加する。読み込み中・エラー中・末尾のときは何もしない */
  async function loadMore(): Promise<void> {
    if (status.value !== "idle" || nextPageToken.value === null) {
      return;
    }
    await load(false);
  }

  /** エラーになった読み込みをやり直す */
  function retry(): Promise<void> {
    return load(nextPageToken.value === null);
  }

  /** ドラッグで並べ替えた結果を反映する（保存はしない） */
  function reorder(next: DriveItem[]): void {
    items.value = next;
  }

  return {
    mode,
    folderId,
    query,
    items,
    nextPageToken,
    status,
    error,
    hasLoaded,
    setApi,
    openFolder,
    search,
    loadMore,
    retry,
    reorder,
  };
});
