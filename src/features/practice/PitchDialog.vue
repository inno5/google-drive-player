<script setup lang="ts">
import ModalSheet from "@/shared/ui/ModalSheet.vue";
import { PITCH_MAX, PITCH_MIN, formatPitch } from "./params";

const { open, pitch } = defineProps<{
  open: boolean;
  /** 半音 */
  pitch: number;
}>();

const emit = defineEmits<{
  close: [];
  change: [pitch: number];
}>();
</script>

<template>
  <ModalSheet :open="open" title="ピッチ（半音）" @close="emit('close')">
    <div class="pitch">
      <button
        type="button"
        class="step"
        aria-label="半音下げる"
        :disabled="pitch <= PITCH_MIN"
        @click="emit('change', pitch - 1)"
      >
        −
      </button>
      <strong class="value" data-testid="pitch-value">{{
        formatPitch(pitch)
      }}</strong>
      <button
        type="button"
        class="step"
        aria-label="半音上げる"
        :disabled="pitch >= PITCH_MAX"
        @click="emit('change', pitch + 1)"
      >
        ＋
      </button>
    </div>
    <button
      type="button"
      class="reset"
      :disabled="pitch === 0"
      @click="emit('change', 0)"
    >
      原曲に戻す
    </button>
  </ModalSheet>
</template>

<style scoped>
.pitch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
}
.value {
  min-width: 3em;
  font-size: 32px;
}
.step {
  width: 56px;
  height: 56px;
  border: 1px solid var(--color-main);
  border-radius: 50%;
  background: var(--color-white);
  color: var(--color-main);
  font-size: 28px;
  cursor: pointer;
}
.reset {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: var(--color-white);
  color: inherit;
  font-size: 14px;
  cursor: pointer;
}
.step:disabled,
.reset:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
