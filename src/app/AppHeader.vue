<script setup lang="ts">
import { useAuthStore } from "@/features/auth";

const auth = useAuthStore();
</script>

<template>
  <header class="app-header">
    <RouterLink
      v-if="auth.status === 'signedIn'"
      :to="{ name: 'home' }"
      class="title"
    >
      Google Drive Player
    </RouterLink>
    <span v-else class="title">Google Drive Player</span>
    <span class="spacer" />
    <RouterLink :to="{ name: 'debug' }" class="link" title="デバッグ"
      >?</RouterLink
    >
    <button
      v-if="auth.status === 'signedIn'"
      type="button"
      class="signout"
      @click="auth.signOut()"
    >
      サインアウト
    </button>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 12px;
  background: var(--color-main);
  color: var(--color-white);
}
.title {
  font-size: 16px;
  font-weight: bold;
  color: inherit;
  text-decoration: none;
}
.spacer {
  flex: 1;
}
.link {
  color: inherit;
  text-decoration: none;
}
.signout {
  border: 1px solid var(--color-white);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  padding: 4px 8px;
  font-size: 12px;
}
</style>
