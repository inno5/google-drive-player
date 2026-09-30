import { onBeforeUnmount, onMounted, type ShallowRef } from "vue";

/**
 * 目印の要素（一覧の末尾）が見える範囲に入ったら onReach を呼ぶ。
 * IntersectionObserver は「見え方が変わったとき」にしか通知しないので、
 * 読み込み後にまだ末尾が見えているときは recheck() で再判定させる。
 */
export function useInfiniteScroll(
  sentinel: Readonly<ShallowRef<HTMLElement | null>>,
  root: Readonly<ShallowRef<HTMLElement | null>>,
  onReach: () => void,
): { recheck: () => void } {
  let observer: IntersectionObserver | null = null;
  let observed: HTMLElement | null = null;

  function recheck(): void {
    if (!observer) {
      return;
    }
    if (observed) {
      observer.unobserve(observed);
    }
    observed = sentinel.value;
    if (observed) {
      observer.observe(observed);
    }
  }

  onMounted(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onReach();
        }
      },
      { root: root.value, rootMargin: "200px" },
    );
    recheck();
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    observed = null;
  });

  return { recheck };
}
