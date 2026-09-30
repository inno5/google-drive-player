<script setup lang="ts">
import { useAuthStore } from "@/features/auth";
import AppHeader from "./AppHeader.vue";

const auth = useAuthStore();
</script>

<template>
  <AppHeader />
  <main class="app-body">
    <p v-if="auth.status === 'unknown'" class="loading">読み込み中…</p>
    <RouterView v-else />
  </main>
</template>

<style scoped>
.app-body {
  position: relative;
  max-width: var(--app-max-width);
  margin: 0 auto;
}
.loading {
  padding: 24px;
}
</style>
