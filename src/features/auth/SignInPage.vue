<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { useAuthStore } from "./auth-store";

const auth = useAuthStore();
const buttonElement = useTemplateRef<HTMLElement>("googleSignInButton");

onMounted(() => {
  if (buttonElement.value) {
    auth.renderSignInButton(buttonElement.value);
  }
});
</script>

<template>
  <div class="signin-page">
    <div class="content">
      <p class="text">
        これは Google Drive 内の音楽を再生するアプリケーションです。
        利用するためには Google アカウントにサインインしてください。
      </p>
      <p v-if="auth.error" class="error" role="alert">{{ auth.error }}</p>
      <div ref="googleSignInButton" class="signin-button"></div>
    </div>
  </div>
</template>

<style scoped>
.signin-page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-main);
  color: var(--color-white);
}

.content {
  padding: 16px 24px;
}

.text {
  margin: 0 0 12px;
  line-height: 1.8;
  text-align: left;
}

.error {
  margin: 0 0 12px;
  font-size: 12px;
  text-align: left;
  word-break: break-all;
}

.signin-button {
  display: inline-block;
  margin: 0 auto;
}
</style>
