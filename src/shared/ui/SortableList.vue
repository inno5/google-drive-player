<script setup lang="ts" generic="T extends { id: string }">
import { VueDraggable } from "vue-draggable-plus";

/** ドラッグで並べ替えられる一覧。並べ替え後の配列を v-model で返す */
const model = defineModel<T[]>({ required: true });

defineSlots<{
  default(props: { item: T; index: number }): unknown;
}>();
</script>

<template>
  <VueDraggable
    v-model="model"
    :animation="200"
    :delay="100"
    :delay-on-touch-only="true"
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
