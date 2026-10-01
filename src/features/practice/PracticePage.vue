<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { formatTime } from "@/shared/lib/format";
import { usePlayPauseKey } from "@/shared/ui/usePlayPauseKey";
import SeekBar from "./SeekBar.vue";
import StepControl from "./StepControl.vue";
import {
  PITCH_MAX,
  PITCH_MIN,
  SPEED_MAX,
  SPEED_MIN,
  formatPitch,
  formatSpeed,
} from "./params";
import { usePracticeStore, type PracticeSong } from "./practice-store";

/**
 * 練習ビュー。メインで再生していた曲を読み込んで、ピッチ・速度を変えながら聴く。
 * 曲の切り替えはない（メインで選び直す）。
 */
const { song, title = "" } = defineProps<{
  /** 練習する曲。ない場合は案内を出す */
  song: PracticeSong | null;
  /** 画面に出す曲名 */
  title?: string;
}>();

const store = usePracticeStore();

const ready = computed(() => store.phase === "ready");
const loading = computed(
  () => store.phase === "downloading" || store.phase === "decoding",
);
const loadingLabel = computed(() =>
  store.phase === "downloading"
    ? `ダウンロード中 ${Math.round(store.progress * 100)}%`
    : "デコード中…",
);

usePlayPauseKey({ toggle: () => store.toggle() });

function onVisibilityChange(): void {
  if (!document.hidden) {
    store.recover();
  }
}

onMounted(() => {
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (song) {
    void store.open(song);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange);
  store.close();
});
</script>

<template>
  <div class="practice">
    <p v-if="!song" class="message">
      メインビューで曲を再生してから開いてください
    </p>
    <template v-else>
      <p class="title">{{ title || song.name }}</p>
      <p v-if="loading" class="message">{{ loadingLabel }}</p>
      <p v-else-if="store.phase === 'error'" class="message error" role="alert">
        {{ store.error }}
      </p>
      <template v-else-if="ready">
        <div class="bar">
          <SeekBar
            :duration="store.duration"
            :position="store.position"
            :marker="store.marker"
            :overview="store.overview"
            @seek="store.tap"
            @scrub-start="store.beginScrub"
            @scrub="store.scrubTo"
            @scrub-end="store.endScrub"
          />
        </div>
        <div class="controls">
          <div class="control-col-left">
            <p class="time">
              {{ formatTime(store.position) }} /
              {{ formatTime(store.duration) }}
            </p>
            <div class="transport">
              <button
                type="button"
                class="prev"
                aria-label="マーカーまたは先頭へ戻る"
                @click="store.prev()"
              >
                <span class="icon material-icons">skip_previous</span>
              </button>
              <button
                type="button"
                class="play"
                :aria-label="store.playing ? '一時停止' : '再生'"
                @click="store.toggle()"
              >
                <span class="icon material-icons">{{
                  store.playing ? "pause" : "play_arrow"
                }}</span>
              </button>
              <button
                type="button"
                class="next"
                aria-label="マーカーへ進む"
                @click="store.next()"
              >
                <span class="icon material-icons">skip_next</span>
              </button>
            </div>
          </div>
          <div class="control-col-right">
            <div class="pitch">
              <StepControl
                label="ピッチ"
                :display="formatPitch(store.pitch)"
                :reset-label="'±0'"
                :can-decrease="store.pitch > PITCH_MIN"
                :can-increase="store.pitch < PITCH_MAX"
                :can-reset="store.pitch !== 0"
                @decrease="store.stepPitch(-1)"
                @increase="store.stepPitch(1)"
                @reset="store.setPitch(0)"
              />
            </div>
            <div class="speed">
              <StepControl
                label="速度"
                :display="formatSpeed(store.speed)"
                :reset-label="formatSpeed(1)"
                :can-decrease="store.speed > SPEED_MIN"
                :can-increase="store.speed < SPEED_MAX"
                :can-reset="store.speed !== 1"
                @decrease="store.stepSpeed(-1)"
                @increase="store.stepSpeed(1)"
                @reset="store.setSpeed(1)"
              />
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.practice {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-width: var(--app-max-width);
  height: 100%;
  margin: 0 auto;
}
.title {
  flex: none;
  margin: 0;
  padding: 8px 12px;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.message {
  margin: 0;
  padding: 24px;
}
.message.error {
  color: #c33;
}
.bar {
  flex: 1;
  min-height: 0;
}
.controls {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 12px calc(12px + env(safe-area-inset-bottom));
  margin: 0 auto;

  .control-col-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .control-col-right {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}
.time {
  grid-area: time;
  margin: 0;
  font-size: 16px;
}
.transport {
  display: flex;
  grid-area: transport;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.pitch {
  grid-area: pitch;
}
.speed {
  grid-area: speed;
}
.play,
.prev,
.next {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.prev,
.next {
  width: 36px;
  height: 36px;
}
.play {
  width: 48px;
  height: 48px;
  background: var(--color-main);
  color: var(--color-white);
}
.play .icon {
  font-size: 32px;
}
.prev,
.next {
  background: var(--color-gray);
  color: var(--color-black);
}
.prev .icon,
.next .icon {
  font-size: 28px;
}
</style>
