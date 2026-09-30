<script setup lang="ts">
import { createClickCounter } from "@/shared/lib/click-count";
import { formatBytes } from "@/shared/lib/format";

const {
  index,
  name,
  kind,
  size = null,
  playing = false,
  actionIcon,
  actionLabel,
  actionDisabled = false,
} = defineProps<{
  /** 0 始まりの位置。表示は 1 始まり */
  index: number;
  name: string;
  kind: "folder" | "audio";
  size?: number | null;
  playing?: boolean;
  /** 行末ボタンの Material Icons 名 */
  actionIcon: string;
  actionLabel: string;
  actionDisabled?: boolean;
}>();

const emit = defineEmits<{
  /** 行のダブルクリック / ダブルタップ */
  activate: [];
  /** 行末のボタン */
  action: [];
}>();

const countClick = createClickCounter();

function onClick(): void {
  if (countClick() === "double") {
    emit("activate");
  }
}
</script>

<template>
  <div class="track-row" :class="{ playing }" :title="name" @click="onClick">
    <span class="cell-no">{{ index + 1 }}</span>
    <span class="cell-title">
      <span class="icon material-icons">{{
        kind === "folder" ? "folder" : "audiotrack"
      }}</span>
      <span class="name">{{ name }}</span>
    </span>
    <span class="cell-size">{{ formatBytes(size) }}</span>
    <button
      type="button"
      class="cell-ctrl"
      :aria-label="actionLabel"
      :disabled="actionDisabled"
      @click.stop="emit('action')"
    >
      <span class="icon material-icons">{{ actionIcon }}</span>
    </button>
  </div>
</template>

<style scoped>
.track-row {
  display: flex;
  align-items: center;
  padding: 4px 0;
  text-align: left;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.track-row:hover {
  background: rgb(59 190 192 / 10%);
}
.track-row.playing {
  background-color: var(--color-main);
  color: var(--color-white);
  font-weight: bold;
}
.cell-no {
  flex: none;
  min-width: 36px;
  padding: 0 8px 0 12px;
  text-align: right;
  white-space: nowrap;
}
.cell-title {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}
.cell-title .icon {
  flex: none;
  margin-right: 2px;
  font-size: 18px;
}
.name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cell-size {
  flex: none;
  padding: 0 8px;
  color: rgb(51 51 51 / 60%);
  white-space: nowrap;
}
.playing .cell-size {
  color: inherit;
}
.cell-ctrl {
  flex: none;
  padding: 0 12px 0 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.cell-ctrl:disabled {
  opacity: 0.3;
  cursor: default;
}
.cell-ctrl:not(:disabled):active {
  opacity: 0.6;
}
.cell-ctrl .icon {
  display: block;
  width: 28px;
  height: 28px;
  font-size: 24px;
  line-height: 28px;
  text-align: center;
}
</style>
