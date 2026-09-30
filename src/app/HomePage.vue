<script setup lang="ts">
import { useAuthStore } from "@/features/auth";

const auth = useAuthStore();
</script>

<template>
  <section class="home">
    <h2>サインインしています</h2>
    <p v-if="auth.restoredFromStorage">（保存済みのトークンで復元）</p>
    <p>Drive の一覧と再生はステップ 2 で実装します。</p>
  </section>
</template>

<style scoped>
.home {
  padding: 24px 16px;
}
</style>
