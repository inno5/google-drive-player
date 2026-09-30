<script setup lang="ts">
import { watch } from "vue";
import { useAuthStore } from "@/features/auth";
import { usePlayerStore } from "@/features/player";
import AppToast from "@/shared/ui/AppToast.vue";
import AppHeader from "./AppHeader.vue";

const auth = useAuthStore();
const player = usePlayerStore();

const APP_TITLE = "Google Drive Player";

// 再生中の曲名をページのタイトルにする
watch(
  () => player.current,
  (current) => {
    document.title = current ? current.name : APP_TITLE;
  },
  { immediate: true },
);

// サインアウトしたら再生を止める
watch(
  () => auth.status,
  (status) => {
    if (status === "signedOut") {
      player.stop();
    }
  },
);
</script>

<template>
  <AppHeader />
  <main class="app-body">
    <p v-if="auth.status === 'unknown'" class="loading">読み込み中…</p>
    <RouterView v-else />
  </main>
  <AppToast />
</template>

<style scoped>
.app-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.loading {
  padding: 24px;
}
</style>
