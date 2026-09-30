<script setup lang="ts">
import ModalSheet from "@/shared/ui/ModalSheet.vue";
import {
  SPEED_MAX,
  SPEED_MIN,
  SPEED_PRESETS,
  SPEED_STEP,
  formatSpeed,
} from "./params";

const { open, speed } = defineProps<{
  open: boolean;
  /** 倍 */
  speed: number;
}>();

const emit = defineEmits<{
  close: [];
  change: [speed: number];
}>();

function onInput(event: Event): void {
  emit("change", Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <ModalSheet :open="open" title="速度" @close="emit('close')">
    <strong class="value" data-testid="speed-value">{{
      formatSpeed(speed)
    }}</strong>
    <input
      class="slider"
      type="range"
      aria-label="速度"
      :min="SPEED_MIN"
      :max="SPEED_MAX"
      :step="SPEED_STEP"
      :value="speed"
      @input="onInput"
    />
    <div class="presets">
      <button
        v-for="preset in SPEED_PRESETS"
        :key="preset"
        type="button"
        class="preset"
        :class="{ active: preset === speed }"
        @click="emit('change', preset)"
      >
        {{ preset }}
      </button>
    </div>
  </ModalSheet>
</template>

<style scoped>
.value {
  display: block;
  margin-bottom: 12px;
  font-size: 32px;
  text-align: center;
}
.slider {
  display: block;
  width: 100%;
  margin: 0 0 16px;
  accent-color: var(--color-main);
}
.presets {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.preset {
  min-width: 48px;
  padding: 10px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: var(--color-white);
  color: inherit;
  font-size: 14px;
  cursor: pointer;
}
.preset.active {
  border-color: var(--color-main);
  background: var(--color-main);
  color: var(--color-white);
}
</style>
