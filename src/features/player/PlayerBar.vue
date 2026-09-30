<script setup lang="ts">
import { computed } from "vue";
import { createClickCounter } from "@/shared/lib/click-count";
import { formatTime } from "@/shared/lib/format";
import type { PlayMode, PlayerStatus } from "./player-store";

const {
  status,
  currentTime,
  duration,
  loadedRatio,
  playMode,
  displayModeLabel = "",
} = defineProps<{
  status: PlayerStatus;
  /** 秒 */
  currentTime: number;
  /** 秒。不明なら 0 */
  duration: number;
  /** 曲の取得の進み具合（0〜1） */
  loadedRatio: number;
  playMode: PlayMode;
  /** 今の曲名の表示モードの説明（ボタンの説明に使う） */
  displayModeLabel?: string;
}>();

const emit = defineEmits<{
  toggle: [];
  /** シークバーの操作（秒） */
  seek: [seconds: number];
  /** 今の曲の頭へ戻る */
  restart: [];
  prev: [];
  next: [];
  setPlayMode: [mode: PlayMode];
  /** 曲名の表示モードを次へ切り替える */
  cycleDisplayMode: [];
  /** 再生中の曲を一覧の中で表示する */
  locate: [];
}>();

const isPlaying = computed(() => status === "playing");
const isLoading = computed(() => status === "loading");
const loadedPercent = computed(
  () => `${Math.round(Math.min(Math.max(loadedRatio, 0), 1) * 100)}% 100%`,
);

const countPrevClick = createClickCounter();

// シングルクリックで今の曲の頭へ、ダブルクリックで前の曲へ
function onClickPrev(): void {
  if (countPrevClick() === "double") {
    emit("prev");
  } else {
    emit("restart");
  }
}

function onInputSeek(event: Event): void {
  emit("seek", Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <div class="player-bar">
    <div class="seek">
      <span class="time time-current">{{ formatTime(currentTime) }}</span>
      <input
        class="bar"
        type="range"
        min="0"
        step="any"
        aria-label="再生位置"
        :value="currentTime"
        :max="duration"
        :style="{ backgroundSize: loadedPercent }"
        @input="onInputSeek"
      />
      <div v-if="isLoading" class="loading" aria-label="読み込み中">
        <span></span>
      </div>
      <span class="time time-total">{{ formatTime(duration) }}</span>
    </div>

    <div class="buttons">
      <button
        type="button"
        class="btn repeat"
        :class="{ active: playMode === 'repeatOne' }"
        aria-label="1 曲リピート"
        :aria-pressed="playMode === 'repeatOne'"
        @click="emit('setPlayMode', 'repeatOne')"
      >
        <span class="icon material-icons">repeat_one</span>
      </button>
      <button
        type="button"
        class="btn shuffle"
        :class="{ active: playMode === 'shuffle' }"
        aria-label="シャッフル"
        :aria-pressed="playMode === 'shuffle'"
        @click="emit('setPlayMode', 'shuffle')"
      >
        <span class="icon material-icons">shuffle</span>
      </button>

      <button
        type="button"
        class="btn prev"
        aria-label="頭へ戻る（ダブルクリックで前の曲）"
        title="クリック: 曲の頭へ / ダブルクリック: 前の曲"
        @click="onClickPrev"
      >
        <span class="icon material-icons">fast_rewind</span>
      </button>
      <button
        v-if="!isPlaying"
        type="button"
        class="btn play"
        aria-label="再生"
        @click="emit('toggle')"
      >
        <span class="icon material-icons">play_arrow</span>
      </button>
      <button
        v-else
        type="button"
        class="btn pause"
        aria-label="一時停止"
        @click="emit('toggle')"
      >
        <span class="icon material-icons">pause</span>
      </button>
      <button
        type="button"
        class="btn next"
        aria-label="次の曲"
        @click="emit('next')"
      >
        <span class="icon material-icons">fast_forward</span>
      </button>

      <button
        type="button"
        class="btn display-mode"
        aria-label="曲名の表示を切り替え"
        :title="`曲名の表示: ${displayModeLabel}`"
        @click="emit('cycleDisplayMode')"
      >
        <span class="icon material-icons">subtitles</span>
      </button>
      <button
        type="button"
        class="btn locate"
        aria-label="再生中の曲を表示"
        @click="emit('locate')"
      >
        <span class="icon material-icons">manage_search</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.player-bar {
  box-sizing: border-box;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding: 12px;
}
.seek {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 0 16px;
}
.time {
  min-width: 36px;
  font-size: 11px;
}
.bar {
  box-sizing: border-box;
  width: 100%;
  margin: 0 8px;
}
.bar[type="range"] {
  height: 5px;
  border-radius: 6px;
  background: linear-gradient(#fff, #fff) no-repeat #ddd;
  background-size: 0 100%;
  -webkit-appearance: none;
  appearance: none;
}
.bar[type="range"]:focus,
.bar[type="range"]:active {
  outline: none;
}
.bar[type="range"]::-webkit-slider-thumb {
  position: relative;
  display: block;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-white);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}
.bar[type="range"]::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background-color: var(--color-white);
  cursor: pointer;
}
.loading {
  position: absolute;
  inset: -8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.loading span {
  display: block;
  width: 36px;
  height: 36px;
  border: solid 3px rgb(255 255 255 / 50%);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spinner 800ms linear infinite;
}
@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}
.buttons {
  display: flex;
  align-items: center;
  width: 100%;
}
.btn {
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.btn:hover {
  opacity: 0.8;
}
.btn:active {
  opacity: 0.6;
}
.btn .icon {
  width: 36px;
  height: 36px;
  font-size: 28px;
  line-height: 36px;
  text-align: center;
}
.repeat {
  margin-right: 4px;
}
.repeat .icon,
.shuffle .icon {
  opacity: 0.4;
}
.repeat.active .icon,
.shuffle.active .icon {
  opacity: 1;
}
.shuffle {
  margin-right: auto;
}
.play,
.pause {
  margin: 0 8px;
}
.display-mode {
  margin-left: auto;
}
</style>
