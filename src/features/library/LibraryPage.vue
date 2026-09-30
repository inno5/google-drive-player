<script setup lang="ts">
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  DrivePanel,
  ROOT_FOLDER_ID,
  isFolder,
  useDriveStore,
} from "@/features/drive";
import type { DriveItem } from "@/features/drive";
import ViewTabs from "./ViewTabs.vue";
import { useViewStore } from "./view-store";

const route = useRoute();
const router = useRouter();
const drive = useDriveStore();
const viewStore = useViewStore();

// URL が正。ルートが変わったら、その内容を読み込む
watch(
  () => [route.name, route.params.id, route.params.q] as const,
  ([name, id, q]) => {
    if (name === "search") {
      void drive.search(String(q));
    } else if (name === "folder") {
      void drive.openFolder(String(id));
    } else if (name === "home") {
      void drive.openFolder(ROOT_FOLDER_ID);
    }
    // それ以外（サインイン画面への切り替え中など）は何もしない
  },
  { immediate: true },
);

function onSearch(word: string): void {
  if (word === "") {
    if (route.name !== "home") {
      void router.push({ name: "home" });
    }
  } else if (route.name !== "search" || route.params.q !== word) {
    void router.push({ name: "search", params: { q: word } });
  }
}

function onActivate(item: DriveItem): void {
  if (isFolder(item)) {
    void router.push({ name: "folder", params: { id: item.id } });
  }
  // 再生はステップ 4
}
</script>

<template>
  <div class="library">
    <ViewTabs :view="viewStore.view" @select="viewStore.select" />
    <div class="panes" :class="{ 'two-column': viewStore.view === 'both' }">
      <section v-show="viewStore.view !== 'playlist'" class="pane pane-drive">
        <div class="pane-inner">
          <DrivePanel
            :items="drive.items"
            :status="drive.status"
            :error="drive.error"
            :has-more="drive.nextPageToken !== null"
            :has-loaded="drive.hasLoaded"
            :query="drive.mode === 'search' ? drive.query : ''"
            @search="onSearch"
            @activate="onActivate"
            @reorder="drive.reorder"
            @load-more="drive.loadMore()"
            @retry="drive.retry()"
          />
        </div>
      </section>
      <section v-show="viewStore.view !== 'drive'" class="pane pane-playlist">
        <div class="pane-inner">
          <p class="placeholder">プレイリストはステップ 3 で実装します。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.library {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}
.panes {
  display: flex;
  flex: 1;
  min-height: 0;
}
.pane {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--color-white);
}
.pane-drive {
  background-color: var(--color-gray);
}
.pane-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--app-max-width);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
}
/* 2 列のときは、それぞれ中央寄りに幅の半分まで */
.two-column .pane-inner {
  max-width: calc(var(--app-max-width) / 2);
}
.two-column .pane-drive .pane-inner {
  margin: 0 0 0 auto;
}
.two-column .pane-playlist .pane-inner {
  margin: 0 auto 0 0;
}
.placeholder {
  padding: 24px 12px;
  color: #666;
  font-size: 14px;
}
</style>
