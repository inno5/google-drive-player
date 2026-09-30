<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";

const { open, title } = defineProps<{
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

function onKeydown(event: KeyboardEvent): void {
  if (open && event.key === "Escape") {
    emit("close");
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div v-if="open" class="backdrop" @click.self="emit('close')">
    <section class="sheet" role="dialog" aria-modal="true" :aria-label="title">
      <header class="head">
        <h2 class="title">{{ title }}</h2>
        <button
          type="button"
          class="close"
          aria-label="閉じる"
          @click="emit('close')"
        >
          <span class="icon material-icons">close</span>
        </button>
      </header>
      <slot />
    </section>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(0 0 0 / 40%);
}
.sheet {
  box-sizing: border-box;
  width: 100%;
  max-width: 480px;
  padding: 12px 16px calc(24px + env(safe-area-inset-bottom));
  border-radius: 12px 12px 0 0;
  background: var(--color-white);
}
@media screen and (min-width: 768px) {
  .backdrop {
    align-items: center;
  }
  .sheet {
    border-radius: 12px;
  }
}
.head {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.title {
  margin: 0;
  font-size: 16px;
}
.close {
  margin-left: auto;
  padding: 4px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.close .icon {
  display: block;
  font-size: 24px;
}
</style>
