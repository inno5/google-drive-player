<script setup lang="ts">
import { useAuthStore } from "@/features/auth";

const auth = useAuthStore();
</script>

<template>
  <header class="app-header">
    <div class="inner">
      <h1 class="title">
        <RouterLink
          v-if="auth.status === 'signedIn'"
          :to="{ name: 'home' }"
          class="title-link"
        >
          Google Drive Player
        </RouterLink>
        <span v-else class="title-link">Google Drive Player</span>
      </h1>

      <nav class="nav">
        <button
          v-if="auth.status === 'signedIn'"
          type="button"
          class="nav-link signout"
          @click="auth.signOut()"
        >
          サインアウト
        </button>
        <RouterLink
          :to="{ name: 'debug' }"
          class="nav-link help"
          aria-label="デバッグ情報"
          title="デバッグ情報"
        >
          <span class="icon material-icons">help_outline</span>
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background-color: var(--color-main);
  color: var(--color-white);
}
.inner {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: 4px 12px;
}
@media screen and (min-width: 768px) {
  .inner {
    padding: 12px 24px;
  }
}
.title {
  margin: 0;
  font-size: 16px;
}
.title-link {
  display: block;
  padding: 8px 8px 8px 0;
  color: #fff;
  font-weight: bold;
  text-decoration: none;
}
a.title-link:hover,
.nav-link:hover {
  opacity: 0.8;
}
a.title-link:active,
.nav-link:active {
  opacity: 0.6;
}
.nav {
  display: flex;
  align-items: center;
  margin-left: auto;
  font-size: 12px;
}
.nav-link {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}
.signout {
  padding: 8px 0 8px 8px;
}
.help {
  margin-left: 16px;
}
.help .icon {
  display: block;
  width: 24px;
  height: 24px;
  font-size: 24px;
  line-height: 24px;
}
</style>
