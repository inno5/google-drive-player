import { readonly, ref } from "vue";

export type ToastType = "info" | "error";

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

const DEFAULT_DURATION_MS = 2200;
const ERROR_DURATION_MS = 4000;

const toasts = ref<ToastMessage[]>([]);
let nextId = 1;

/** アプリ全体で 1 つのトースト表示。AppToast.vue が toasts を描画する */
export function useToast() {
  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  function show(
    text: string,
    options: { type?: ToastType; durationMs?: number } = {},
  ): void {
    const type = options.type ?? "info";
    const id = nextId++;
    toasts.value = [...toasts.value, { id, text, type }];
    setTimeout(
      () => {
        dismiss(id);
      },
      options.durationMs ??
        (type === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS),
    );
  }

  function clear(): void {
    toasts.value = [];
  }

  return { toasts: readonly(toasts), show, dismiss, clear };
}
