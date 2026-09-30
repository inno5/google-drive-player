<script setup lang="ts">
import { useAuthStore } from "@/features/auth";
import AppToast from "@/shared/ui/AppToast.vue";
import AppHeader from "./AppHeader.vue";

const auth = useAuthStore();
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
