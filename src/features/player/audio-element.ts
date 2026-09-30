/** <audio> 要素を隠すための薄いラッパー。store はこのインターフェースだけに依存する */

export interface AudioEvents {
  timeUpdate(seconds: number): void;
  /** 曲の長さ（秒）。不明なら 0 */
  durationChange(seconds: number): void;
  ended(): void;
  /** 再生できなかった（曲の読み込みの失敗・対応しない形式など） */
  error(): void;
  playing(): void;
  paused(): void;
}

export interface AudioPlayer {
  setSource(url: string): void;
  clearSource(): void;
  /** 再生する。ブラウザに拒否されたら reject する（iOS で操作から時間が空いたときなど） */
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  subscribe(events: Partial<AudioEvents>): void;
}

export function createAudioPlayer(
  element: HTMLAudioElement = document.createElement("audio"),
): AudioPlayer {
  let events: Partial<AudioEvents> = {};
  element.preload = "auto";

  element.addEventListener("timeupdate", () => {
    events.timeUpdate?.(element.currentTime);
  });
  const notifyDuration = () => {
    events.durationChange?.(
      Number.isFinite(element.duration) ? element.duration : 0,
    );
  };
  element.addEventListener("loadedmetadata", notifyDuration);
  element.addEventListener("durationchange", notifyDuration);
  element.addEventListener("ended", () => {
    events.ended?.();
  });
  element.addEventListener("error", () => {
    // src を外したときのエラーは無視する
    if (element.getAttribute("src")) {
      events.error?.();
    }
  });
  element.addEventListener("playing", () => {
    events.playing?.();
  });
  element.addEventListener("pause", () => {
    events.paused?.();
  });

  return {
    setSource(url) {
      element.src = url;
    },
    clearSource() {
      element.pause();
      element.removeAttribute("src");
      element.load();
    },
    play: () => element.play(),
    pause() {
      element.pause();
    },
    seek(seconds) {
      element.currentTime = seconds;
    },
    subscribe(next) {
      events = next;
    },
  };
}
