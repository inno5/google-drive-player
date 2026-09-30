const loading = new Map<string, Promise<void>>();

/** 外部スクリプトを 1 回だけ読み込む。失敗したら次回は読み込み直す。 */
export function loadScript(src: string): Promise<void> {
  const cached = loading.get(src);
  if (cached) {
    return cached;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading.delete(src);
      script.remove();
      reject(new Error(`スクリプトを読み込めませんでした: ${src}`));
    };
    document.head.appendChild(script);
  });

  loading.set(src, promise);
  return promise;
}
