<script setup lang="ts">
import { ref, useTemplateRef, watch } from "vue";
import SortableList from "@/shared/ui/SortableList.vue";
import TrackRow from "@/shared/ui/TrackRow.vue";
import { isFolder, type DriveItem } from "./drive-types";
import type { DriveStatus } from "./drive-store";
import { useInfiniteScroll } from "./useInfiniteScroll";

const {
  items,
  status,
  error = null,
  hasMore,
  hasLoaded,
  query = "",
  playingId = "",
  canAdd = false,
} = defineProps<{
  items: DriveItem[];
  status: DriveStatus;
  error?: string | null;
  /** 続きのページがあるか */
  hasMore: boolean;
  /** 最初のページを読み終えたか */
  hasLoaded: boolean;
  /** 現在の検索語（検索欄の初期値・同期用） */
  query?: string;
  playingId?: string;
  /** 行末の追加ボタンを有効にするか */
  canAdd?: boolean;
}>();

const emit = defineEmits<{
  /** 検索欄で Enter。空文字は検索の解除 */
  search: [word: string];
  /** フォルダなら開く、ファイルなら再生 */
  activate: [item: DriveItem];
  add: [item: DriveItem];
  reorder: [items: DriveItem[]];
  loadMore: [];
  retry: [];
}>();

const word = ref(query);
watch(
  () => query,
  (next) => {
    word.value = next;
  },
);

function onKeydownSearch(event: KeyboardEvent): void {
  // IME の変換確定の Enter は無視する
  if (event.key !== "Enter" || event.isComposing) {
    return;
  }
  (event.target as HTMLInputElement).blur();
  emit("search", word.value.trim());
}

const listElement = useTemplateRef<HTMLElement>("list");
const sentinel = useTemplateRef<HTMLElement>("sentinel");
const { recheck } = useInfiniteScroll(sentinel, listElement, () => {
  emit("loadMore");
});
// 読み込みのあとも末尾が見えているなら、続きを読む
watch(
  () => [items.length, status] as const,
  () => {
    if (status === "idle" && hasMore) {
      recheck();
    }
  },
  { flush: "post" },
);
</script>

<template>
  <div class="drive-panel">
    <div class="search">
      <span class="search-icon material-icons">search</span>
      <input
        v-model="word"
        type="text"
        class="search-input"
        placeholder="Search audio files"
        enterkeyhint="search"
        @keydown="onKeydownSearch"
      />
    </div>

    <div ref="list" class="list">
      <SortableList
        :model-value="items"
        @update:model-value="emit('reorder', $event)"
      >
        <template #default="{ item, index }">
          <TrackRow
            :index="index"
            :name="item.name"
            :kind="isFolder(item) ? 'folder' : 'audio'"
            :size="item.size"
            :playing="item.id === playingId"
            action-icon="add_circle_outline"
            action-label="プレイリストに追加"
            :action-disabled="!canAdd"
            @activate="emit('activate', item)"
            @action="emit('add', item)"
          />
        </template>
      </SortableList>

      <div ref="sentinel" class="list-footer">
        <p v-if="status === 'loading'" class="status">Loading...</p>
        <div v-else-if="status === 'error'" class="status">
          <p class="error" role="alert">{{ error }}</p>
          <button type="button" class="retry" @click="emit('retry')">
            再試行
          </button>
        </div>
        <p v-else-if="hasLoaded && items.length === 0" class="status">
          No data :)
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drive-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.search {
  position: relative;
  flex: none;
  padding: 12px;
}
.search-icon {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 32px;
  height: 32px;
  font-size: 20px;
  line-height: 32px;
  opacity: 0.5;
  pointer-events: none;
}
.search-input {
  display: block;
  width: 100%;
  height: 32px;
  padding-left: 28px;
  border: solid 2px var(--color-white);
  font-size: 16px;
  -webkit-appearance: none;
  appearance: none;
}
.search-input::placeholder {
  color: #ccc;
}
.search-input:focus {
  border-color: var(--color-main);
  outline: none;
}
.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.list-footer {
  min-height: 48px;
  padding: 10px 0 24px;
  color: #666;
  font-size: 14px;
}
.status {
  margin: 0;
}
.error {
  margin: 0 0 8px;
  font-size: 12px;
}
.retry {
  padding: 4px 12px;
}
</style>
