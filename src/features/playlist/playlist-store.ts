import { ref } from "vue";
import { defineStore } from "pinia";
import { AuthExpiredError, useAuthStore } from "@/features/auth";
import { createDriveApi, isFolder, type DriveApi } from "@/features/drive";
import { useToast } from "@/shared/ui/useToast";
import { MAX_DEPTH, MAX_TRACKS, collectFolder } from "./folder-collector";
import {
  loadPlaylist,
  savePlaylist,
  type PlaylistItem,
} from "./playlist-storage";

/**
 * プレイリスト（唯一の正）。変更のたびに端末へ保存する。
 * 保存に失敗しても、画面上の状態はそのまま残す。
 */
export const usePlaylistStore = defineStore("playlist", () => {
  const toast = useToast();
  const items = ref<PlaylistItem[]>(loadPlaylist());
  /** フォルダの中身を集めている間だけ非 null。count は集めた曲数 */
  const adding = ref<{ count: number } | null>(null);

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

  function persist(): void {
    if (!savePlaylist(items.value)) {
      toast.show("プレイリストを保存できませんでした", { type: "error" });
    }
  }

  /**
   * 末尾に追加する。同じ ID の曲がすでにあれば、位置はそのままで情報だけを更新する。
   */
  function merge(added: readonly PlaylistItem[]): void {
    const next = [...items.value];
    for (const item of added) {
      const index = next.findIndex((existing) => existing.id === item.id);
      if (index >= 0) {
        next[index] = { ...item };
      } else {
        next.push({ ...item });
      }
    }
    items.value = next;
    persist();
  }

  async function addFolder(folder: PlaylistItem): Promise<void> {
    const current = new AbortController();
    controller = current;
    adding.value = { count: 0 };
    try {
      const result = await collectFolder(getApi(), folder, {
        signal: current.signal,
        onProgress: (count) => {
          adding.value = { count };
        },
      });
      if (current.signal.aborted) {
        return;
      }
      if (result.items.length === 0) {
        toast.show("音声ファイルが見つかりませんでした");
        return;
      }
      merge(result.items);
      if (result.truncated) {
        toast.show(
          `上限（${MAX_TRACKS} 曲・${MAX_DEPTH} 段）までを追加しました`,
        );
      }
    } catch (e) {
      if (current.signal.aborted || e instanceof AuthExpiredError) {
        // キャンセル、または認証切れ（画面はサインイン画面へ切り替わる）
        return;
      }
      toast.show("フォルダの中身を取得できませんでした", { type: "error" });
    } finally {
      if (controller === current) {
        controller = null;
        adding.value = null;
      }
    }
  }

  /** ファイルはそのまま、フォルダは中身をまとめて追加する */
  async function add(item: PlaylistItem): Promise<void> {
    if (!isFolder(item)) {
      merge([item]);
      return;
    }
    if (adding.value) {
      toast.show("フォルダを追加中です");
      return;
    }
    await addFolder(item);
  }

  /** フォルダの追加を取りやめる（何も追加しない） */
  function cancelAdding(): void {
    controller?.abort();
    controller = null;
    adding.value = null;
  }

  function remove(id: string): void {
    items.value = items.value.filter((item) => item.id !== id);
    persist();
  }

  /** ドラッグで並べ替えた結果を反映して保存する */
  function reorder(next: PlaylistItem[]): void {
    items.value = next;
    persist();
  }

  function clear(): void {
    items.value = [];
    persist();
  }

  return {
    items,
    adding,
    setApi,
    add,
    cancelAdding,
    remove,
    reorder,
    clear,
  };
});
