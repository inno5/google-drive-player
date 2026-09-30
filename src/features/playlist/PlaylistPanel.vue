<script setup lang="ts">
import SortableList from "@/shared/ui/SortableList.vue";
import TrackRow from "@/shared/ui/TrackRow.vue";
import type { PlaylistItem } from "./playlist-storage";

const {
  items,
  playingId = "",
  adding = null,
} = defineProps<{
  items: PlaylistItem[];
  playingId?: string;
  /** フォルダの中身を集めている間だけ渡す */
  adding?: { count: number } | null;
}>();

const emit = defineEmits<{
  activate: [item: PlaylistItem];
  remove: [item: PlaylistItem];
  reorder: [items: PlaylistItem[]];
  clear: [];
  cancelAdd: [];
}>();
</script>

<template>
  <div class="playlist-panel">
    <div class="ctrl">
      <button type="button" class="clear" @click="emit('clear')">
        <span class="text">Remove All</span>
        <span class="icon material-icons">delete_outline</span>
      </button>
    </div>

    <div class="list">
      <p v-if="items.length === 0" class="empty">No data :)</p>
      <SortableList
        :model-value="items"
        @update:model-value="emit('reorder', $event)"
      >
        <template #default="{ item, index }">
          <TrackRow
            :index="index"
            :name="item.name"
            kind="audio"
            :size="item.size"
            :playing="item.id === playingId"
            action-icon="delete_outline"
            action-label="プレイリストから削除"
            @activate="emit('activate', item)"
            @action="emit('remove', item)"
          />
        </template>
      </SortableList>
    </div>

    <div v-if="adding" class="adding" role="status">
      <p>追加中… {{ adding.count }} 曲</p>
      <button type="button" class="cancel" @click="emit('cancelAdd')">
        キャンセル
      </button>
    </div>
  </div>
</template>

<style scoped>
.playlist-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.ctrl {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  min-height: 32px;
  padding: 12px;
}
.clear {
  display: inline-flex;
  align-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}
.clear:hover .text {
  text-decoration: underline;
}
.clear .text {
  padding-right: 4px;
}
.clear .icon {
  width: 28px;
  height: 28px;
  font-size: 24px;
  line-height: 28px;
}
.list {
  flex: 1;
  min-height: 0;
  padding-bottom: 24px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.empty {
  margin: 0;
  padding: 10px 0;
  color: #666;
  font-size: 14px;
}
.adding {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgb(255 255 255 / 85%);
}
.adding p {
  margin: 0;
  font-size: 14px;
}
.cancel {
  padding: 4px 16px;
}
</style>
