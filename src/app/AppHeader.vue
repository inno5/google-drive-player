<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/features/auth";
import { isMainView, resolveToggle, type ToggleTarget } from "./nav-toggle";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

// 練習・デバッグから戻るときの行き先（直前のメインビュー。フォルダや検索語を含む）
const lastMainPath = ref<string | null>(null);
watch(
  () => route.fullPath,
  (path) => {
    if (isMainView(route.name)) {
      lastMainPath.value = path;
    }
  },
  { immediate: true },
);

function toggle(target: ToggleTarget): void {
  void router.push(resolveToggle(route.name, target, lastMainPath.value));
}
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
        <button
          v-if="auth.status === 'signedIn'"
          type="button"
          class="nav-link icon-link practice"
          :class="{ active: route.name === 'practice' }"
          aria-label="練習ビュー"
          title="練習ビュー"
          @click="toggle('practice')"
        >
          <span class="icon material-icons">tune</span>
        </button>
        <button
          type="button"
          class="nav-link icon-link help"
          :class="{ active: route.name === 'debug' }"
          aria-label="デバッグ情報"
          title="デバッグ情報"
          @click="toggle('debug')"
        >
          <span class="icon material-icons">help_outline</span>
        </button>
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
.icon-link {
  margin-left: 16px;
}
.icon-link.active {
  opacity: 0.6;
}
.icon-link .icon {
  display: block;
  width: 24px;
  height: 24px;
  font-size: 24px;
  line-height: 24px;
}
</style>
