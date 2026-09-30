<script setup lang="ts" generic="T extends { id: string }">
import { VueDraggable } from "vue-draggable-plus";

/**
 * ドラッグで並べ替えられる一覧。並べ替え後の配列を v-model で返す。
 * タッチ操作では、1 秒押し続けたときだけドラッグを始める（それより前に指が動けばスクロール）。
 * マウスは待たずにドラッグできる。
 */
const TOUCH_DRAG_DELAY_MS = 1000;
/** 押している間に許す指の動き（px）。これを超えて動くとスクロール扱いになる */
const TOUCH_START_THRESHOLD_PX = 8;

const model = defineModel<T[]>({ required: true });

defineSlots<{
  default(props: { item: T; index: number }): unknown;
}>();
</script>

<template>
  <VueDraggable
    v-model="model"
    :animation="200"
    :delay="TOUCH_DRAG_DELAY_MS"
    :delay-on-touch-only="true"
    :touch-start-threshold="TOUCH_START_THRESHOLD_PX"
    ghost-class="sortable-ghost"
  >
    <template v-for="(item, index) in model" :key="item.id">
      <slot :item="item" :index="index" />
    </template>
  </VueDraggable>
</template>

<style>
.sortable-ghost {
  background-color: rgb(59 190 192 / 20%);
}
</style>
