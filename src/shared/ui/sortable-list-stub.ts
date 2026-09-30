import { defineComponent, h } from "vue";

/**
 * テスト用。SortableList の代わりに、スロットだけを描画する
 * （ドラッグの実装（vue-draggable-plus）に依存しないため）。
 */
export const SortableListStub = defineComponent({
  props: { modelValue: { type: Array, default: () => [] } },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        (props.modelValue as { id: string }[]).flatMap(
          (item, index) => slots.default?.({ item, index }) ?? [],
        ),
      );
  },
});
