<script setup lang="ts">
import { useToast } from "./useToast";

const { toasts } = useToast();
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <p
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="toast.type"
    >
      {{ toast.text }}
    </p>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 0;
  bottom: 24px;
  left: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.toast {
  max-width: 90%;
  margin: 0;
  padding: 8px 16px;
  border-radius: 4px;
  background: rgb(51 51 51 / 90%);
  color: var(--color-white);
  font-size: 12px;
}
.toast.error {
  background: rgb(190 50 50 / 95%);
}
</style>
