<script setup lang="ts">
/** 横一列の「ラベル: 現在値　［−］［元の値］［＋］」。真ん中のボタンは、押すと元の値に戻す。ピッチと速度で使う */
const {
  label,
  display,
  resetLabel,
  canDecrease = true,
  canIncrease = true,
  canReset = true,
} = defineProps<{
  label: string;
  /** 現在値の表示（+2、×0.75 など） */
  display: string;
  /** 元に戻すボタンの表示（0、×1 など。元の値） */
  resetLabel: string;
  canDecrease?: boolean;
  canIncrease?: boolean;
  canReset?: boolean;
}>();

const emit = defineEmits<{
  decrease: [];
  increase: [];
  reset: [];
}>();
</script>

<template>
  <div class="step-control">
    <span class="label">{{ label }}: </span>
    <span class="value">
      <strong data-testid="value">{{ display }}</strong>
    </span>
    <button
      type="button"
      class="btn"
      :aria-label="`${label}を下げる`"
      :disabled="!canDecrease"
      @click="emit('decrease')"
    >
      −
    </button>
    <button
      type="button"
      class="btn reset"
      :aria-label="`${label}を元に戻す`"
      :disabled="!canReset"
      @click="emit('reset')"
    >
      {{ resetLabel }}
    </button>
    <button
      type="button"
      class="btn"
      :aria-label="`${label}を上げる`"
      :disabled="!canIncrease"
      @click="emit('increase')"
    >
      ＋
    </button>
  </div>
</template>

<style scoped>
.step-control {
  display: flex;
  align-items: center;
  gap: 4px;
}
.label {
  flex: none;
  min-width: 4em;
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
}
.value {
  flex: none;
  min-width: 3em;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
}
.btn {
  flex: none;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--color-main);
  border-radius: 4px;
  background: var(--color-white);
  color: var(--color-main);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.reset {
  font-size: 12px;
}
.btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
