<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { formatTime } from "@/shared/lib/format";
import { usePlayPauseKey } from "@/shared/ui/usePlayPauseKey";
import PitchDialog from "./PitchDialog.vue";
import SeekBar from "./SeekBar.vue";
import SpeedDialog from "./SpeedDialog.vue";
import { formatPitch, formatSpeed } from "./params";
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
const pitchOpen = ref(false);
const speedOpen = ref(false);

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
            :overview="store.overview"
            @seek="store.seek"
            @scrub-start="store.beginScrub"
            @scrub="store.scrubTo"
            @scrub-end="store.endScrub"
          />
        </div>
        <div class="controls">
          <p class="time">
            {{ formatTime(store.position) }} / {{ formatTime(store.duration) }}
          </p>
          <div class="buttons">
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
            <button type="button" class="option" @click="pitchOpen = true">
              <small>ピッチ</small>
              <strong>{{ formatPitch(store.pitch) }}</strong>
            </button>
            <button type="button" class="option" @click="speedOpen = true">
              <small>速度</small>
              <strong>{{ formatSpeed(store.speed) }}</strong>
            </button>
          </div>
        </div>
      </template>
    </template>

    <PitchDialog
      :open="pitchOpen"
      :pitch="store.pitch"
      @close="pitchOpen = false"
      @change="store.setPitch"
    />
    <SpeedDialog
      :open="speedOpen"
      :speed="store.speed"
      @close="speedOpen = false"
      @change="store.setSpeed"
    />
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
  flex: none;
  padding: 8px 12px calc(12px + env(safe-area-inset-bottom));
}
.time {
  margin: 0 0 8px;
  font-size: 12px;
}
.buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.play {
  width: 64px;
  height: 64px;
  border: 0;
  border-radius: 50%;
  background: var(--color-main);
  color: var(--color-white);
  cursor: pointer;
}
.play .icon {
  display: block;
  font-size: 40px;
}
.option {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 88px;
  padding: 8px 12px;
  border: 1px solid var(--color-main);
  border-radius: 8px;
  background: var(--color-white);
  color: var(--color-main);
  cursor: pointer;
}
.option small {
  font-size: 10px;
}
.option strong {
  font-size: 20px;
}
</style>
