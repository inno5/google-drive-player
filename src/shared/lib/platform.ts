/**
 * ホーム画面に追加したアプリ（standalone）として起動しているか。
 * iOS は navigator.standalone、それ以外は display-mode で判定する。
 */
export function isStandalone(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayStandalone =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayStandalone;
}
