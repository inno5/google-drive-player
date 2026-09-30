import { ref } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "@/features/auth";
import { loadSettings, patchSettings } from "@/shared/storage/settings";
import { useToast } from "@/shared/ui/useToast";
import {
  DEFAULT_DISPLAY_MODE,
  DISPLAY_MODE_LABELS,
  buildDisplayName,
  hasArtistAndTitle,
  isDisplayMode,
  nextDisplayMode,
  type DisplayMode,
} from "./display-name";
import { readTags } from "./tag-reader";
import { loadTags, saveTags } from "./tag-storage";
import {
  EMPTY_TAGS,
  type ReadOutcome,
  type TagTarget,
  type TrackTags,
} from "./tag-types";

/** タグを同時に読む数の上限 */
export const MAX_CONCURRENT_READS = 10;
/** タグの保存を、この時間まとめる */
export const PERSIST_DELAY_MS = 500;

/** ロック画面などに出す曲情報（player の NowPlayingMetadata と同じ形） */
export interface TrackMetadata {
  title: string;
  artist?: string;
  album?: string;
}

/** タグを読む関数。テストで差し替える */
export type TagReaderFn = (fileId: string) => Promise<ReadOutcome>;

function targetKey(target: TagTarget): string {
  return `${target.id}:${target.modifiedTime}`;
}

/**
 * プレイリストの曲のタグと、曲名の表示モード。
 *
 * - sync(items) でプレイリストの曲を渡すと、未読・更新された曲のタグを最大 10 件ずつ読む。
 * - タグがない曲は「タグなし」として保存し、読み直さない。通信・認証のエラーは保存せず、
 *   同じ起動中は再試行しない。
 * - プレイリストにない曲のタグは、sync のときに捨てる。
 */
export const useTagStore = defineStore("tags", () => {
  const toast = useToast();
  const tags = ref<Record<string, TrackTags>>(loadTags());

  const savedMode = loadSettings().displayMode;
  const displayMode = ref<DisplayMode>(
    isDisplayMode(savedMode) ? savedMode : DEFAULT_DISPLAY_MODE,
  );

  let reader: TagReaderFn | null = null;
  /** 今のプレイリストの曲（結果を反映してよいかの判定に使う） */
  let wanted = new Map<string, TagTarget>();
  let queue: TagTarget[] = [];
  const inFlight = new Set<string>();
  /** 読み取りに失敗した曲（この起動中は再試行しない） */
  const failed = new Set<string>();
  /** clearQueue のたびに増やす。古い読み取りの失敗を記録しないための印 */
  let epoch = 0;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  /** テストで読み取りを差し替えるためのもの */
  function setReader(next: TagReaderFn): void {
    reader = next;
  }

  function getReader(): TagReaderFn {
    if (!reader) {
      const auth = useAuthStore();
      reader = async (fileId) => readTags(fileId, await auth.getValidToken());
    }
    return reader;
  }

  function schedulePersist(): void {
    if (persistTimer !== null) {
      return;
    }
    persistTimer = setTimeout(() => {
      persistTimer = null;
      // 保存できなくても、メモリ上のタグは使い続ける
      saveTags(tags.value);
    }, PERSIST_DELAY_MS);
  }

  async function readOne(target: TagTarget): Promise<void> {
    const startedEpoch = epoch;
    inFlight.add(target.id);
    let outcome: ReadOutcome;
    try {
      outcome = await getReader()(target.id);
    } catch {
      outcome = { status: "failed" };
    }
    inFlight.delete(target.id);

    if (!wanted.has(target.id)) {
      // 読んでいる間にプレイリストから消された
      return;
    }
    if (outcome.status === "failed") {
      if (startedEpoch === epoch) {
        failed.add(targetKey(target));
      }
      return;
    }
    tags.value[target.id] = {
      modifiedTime: target.modifiedTime,
      ...(outcome.status === "ok" ? outcome.tags : EMPTY_TAGS),
    };
    schedulePersist();
  }

  function pump(): void {
    while (inFlight.size < MAX_CONCURRENT_READS && queue.length > 0) {
      const target = queue.shift();
      if (target) {
        void readOne(target).finally(pump);
      }
    }
  }

  /**
   * プレイリストの曲を渡す。タグが未読・更新された曲を読み取りのキューに積み、
   * プレイリストにない曲のタグを捨てる。
   */
  function sync(items: readonly TagTarget[]): void {
    wanted = new Map(items.map((item) => [item.id, item]));

    let pruned = false;
    for (const id of Object.keys(tags.value)) {
      if (!wanted.has(id)) {
        delete tags.value[id];
        pruned = true;
      }
    }
    if (pruned) {
      schedulePersist();
    }

    queue = queue.filter((target) => wanted.has(target.id));
    const queued = new Set(queue.map((target) => target.id));
    for (const item of items) {
      if (queued.has(item.id) || inFlight.has(item.id)) {
        continue;
      }
      if (tags.value[item.id]?.modifiedTime === item.modifiedTime) {
        continue;
      }
      if (failed.has(targetKey(item))) {
        continue;
      }
      queue.push(item);
      queued.add(item.id);
    }
    pump();
  }

  /** 読み取り待ちを空にする（サインアウト時）。保存済みのタグは残す */
  function clearQueue(): void {
    queue = [];
    failed.clear();
    epoch += 1;
  }

  /** 今の表示モードでの曲名。タグがない曲はファイル名 */
  function displayName(item: { id: string; name: string }): string {
    return buildDisplayName(displayMode.value, item.name, tags.value[item.id]);
  }

  /** ロック画面などに出す曲情報。タグがそろっていて、ファイル名モードでなければ分けて出す */
  function mediaMetadata(item: { id: string; name: string }): TrackMetadata {
    const trackTags = tags.value[item.id];
    if (displayMode.value === "fileName" || !hasArtistAndTitle(trackTags)) {
      return { title: item.name };
    }
    return {
      title: trackTags.title,
      artist: trackTags.artist,
      ...(trackTags.album !== "" ? { album: trackTags.album } : {}),
    };
  }

  /** 表示モードを次へ切り替えて保存し、トーストで知らせる */
  function cycleDisplayMode(): void {
    displayMode.value = nextDisplayMode(displayMode.value);
    patchSettings({ displayMode: displayMode.value });
    toast.show(DISPLAY_MODE_LABELS[displayMode.value]);
  }

  return {
    tags,
    displayMode,
    setReader,
    sync,
    clearQueue,
    displayName,
    mediaMetadata,
    cycleDisplayMode,
  };
});
