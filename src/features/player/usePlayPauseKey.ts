import { onBeforeUnmount, onMounted } from "vue";
import { useToast } from "@/shared/ui/useToast";

/** usePlayPauseKey が player に求めるもの */
export interface PlayPauseKeyPlayer {
  toggle(): "play" | "pause" | null;
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]);

/** 入力欄・ボタンなど、Space を別の用途で使う場所にフォーカスがあるか */
function isSpaceReserved(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}

/** Space キーで再生・停止を切り替え、「play」「pause」をトーストで出す */
export function usePlayPauseKey(player: PlayPauseKeyPlayer): void {
  const toast = useToast();

  function onKeydown(event: KeyboardEvent): void {
    if (
      event.key !== " " ||
      event.isComposing ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isSpaceReserved(event.target)
    ) {
      return;
    }
    const action = player.toggle();
    if (action) {
      // ページのスクロールを止める
      event.preventDefault();
      toast.show(action);
    }
  }

  onMounted(() => {
    document.addEventListener("keydown", onKeydown);
  });
  onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKeydown);
  });
}
