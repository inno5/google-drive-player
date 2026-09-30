<script setup lang="ts">
import { watch } from "vue";
import { useAuthStore } from "@/features/auth";
import { usePlayerStore } from "@/features/player";
import { useTagStore } from "@/features/tags";
import AppToast from "@/shared/ui/AppToast.vue";
import AppHeader from "./AppHeader.vue";

const auth = useAuthStore();
const player = usePlayerStore();
const tags = useTagStore();

// サインアウトしたら、再生とタグの読み取りを止める
watch(
  () => auth.status,
  (status) => {
    if (status === "signedOut") {
      player.stop();
      tags.clearQueue();
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
