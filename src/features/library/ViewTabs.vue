<script setup lang="ts">
import type { ViewMode, ViewTab } from "./view-store";

const { view } = defineProps<{ view: ViewMode }>();
const emit = defineEmits<{ select: [tab: ViewTab] }>();
</script>

<template>
  <div class="view-tabs">
    <button
      type="button"
      class="tab tab-drive"
      :class="{ active: view !== 'playlist' }"
      @click="emit('select', 'drive')"
    >
      Google Drive
    </button>
    <button
      type="button"
      class="tab tab-playlist"
      :class="{ active: view !== 'drive' }"
      @click="emit('select', 'playlist')"
    >
      Playlist
    </button>
  </div>
</template>

<style scoped>
.view-tabs {
  display: flex;
  flex: none;
}
.tab {
  flex: 1;
  padding: 12px 0;
  border: 0;
  background-color: color-mix(in srgb, var(--color-main) 90%, black);
  color: var(--color-white);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
.tab:hover {
  opacity: 0.9;
}
.tab.active {
  background-color: var(--color-white);
  color: var(--color-black);
}
.tab-drive.active {
  background-color: color-mix(in srgb, var(--color-white) 95%, black);
}
</style>
