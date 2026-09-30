<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { formatTime } from "@/shared/lib/format";
import {
  ROWS,
  pointerToSeconds,
  rowStarts,
  secondsToPoint,
} from "./seek-layout";
import { resamplePeaks, type RowPeaks } from "./waveform";

const { duration, position, overview } = defineProps<{
  /** 曲の長さ（秒） */
  duration: number;
  /** 再生位置（秒） */
  position: number;
  /** 波形の集計結果（未計算なら null） */
  overview: RowPeaks[] | null;
}>();

const emit = defineEmits<{
  /** タップ */
  seek: [seconds: number];
  /** ドラッグの開始・途中・終わり */
  scrubStart: [];
  scrub: [seconds: number];
  scrubEnd: [seconds: number];
}>();

/** この距離（px）を超えて動いたら、タップではなくドラッグとして扱う */
const DRAG_THRESHOLD_PX = 6;
const WAVE_COLOR = "#3bbec0";
const LINE_COLOR = "#d9d9d9";

const root = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
/** canvas の実ピクセルの大きさ */
const pixelSize = ref({ width: 0, height: 0 });

const labels = computed(() => rowStarts(duration).map(formatTime));
const head = computed(() => {
  const { row, ratio } = secondsToPoint(position, duration);
  return {
    top: `${row * (100 / ROWS)}%`,
    left: `${ratio * 100}%`,
    height: `${100 / ROWS}%`,
  };
});

function draw(): void {
  const el = canvas.value;
  const context = el?.getContext("2d");
  const { width, height } = pixelSize.value;
  if (!el || !context || width === 0 || height === 0) {
    return;
  }
  el.width = width;
  el.height = height;
  context.clearRect(0, 0, width, height);
  const rowHeight = height / ROWS;
  const peaks = overview ? resamplePeaks(overview, width) : null;
  for (let row = 0; row < ROWS; row++) {
    const top = row * rowHeight;
    const center = top + rowHeight / 2;
    context.fillStyle = LINE_COLOR;
    context.fillRect(0, Math.round(top), width, 1);
    const rowPeaks = peaks?.[row];
    if (!rowPeaks) {
      continue;
    }
    const amplitude = rowHeight * 0.45;
    context.fillStyle = WAVE_COLOR;
    for (let x = 0; x < width; x++) {
      const hi = rowPeaks.max[x] ?? 0;
      const lo = rowPeaks.min[x] ?? 0;
      const y1 = center - hi * amplitude;
      const y2 = center - lo * amplitude;
      context.fillRect(x, y1, 1, Math.max(y2 - y1, 1));
    }
  }
}

let observer: ResizeObserver | null = null;

function measure(): void {
  const el = root.value;
  if (!el) {
    return;
  }
  const scale = window.devicePixelRatio || 1;
  pixelSize.value = {
    width: Math.round(el.clientWidth * scale),
    height: Math.round(el.clientHeight * scale),
  };
}

onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && root.value) {
    observer = new ResizeObserver(measure);
    observer.observe(root.value);
  }
});
onBeforeUnmount(() => {
  observer?.disconnect();
});
watch([pixelSize, () => overview], draw, { flush: "post" });

let start: { x: number; y: number } | null = null;
let dragging = false;
let lastSeconds = 0;

function toSeconds(event: PointerEvent): number {
  const rect = root.value?.getBoundingClientRect();
  if (!rect) {
    return 0;
  }
  return pointerToSeconds(
    event.clientX - rect.left,
    event.clientY - rect.top,
    rect.width,
    rect.height,
    duration,
  );
}

function onPointerDown(event: PointerEvent): void {
  if (!(duration > 0)) {
    return;
  }
  try {
    // 指がバーの外へ出ても、ドラッグを追い続ける
    root.value?.setPointerCapture(event.pointerId);
  } catch {
    // 取れなくても、操作はできる
  }
  start = { x: event.clientX, y: event.clientY };
  dragging = false;
  lastSeconds = toSeconds(event);
}

function onPointerMove(event: PointerEvent): void {
  if (!start) {
    return;
  }
  if (
    !dragging &&
    Math.hypot(event.clientX - start.x, event.clientY - start.y) >
      DRAG_THRESHOLD_PX
  ) {
    dragging = true;
    emit("scrubStart");
  }
  if (dragging) {
    lastSeconds = toSeconds(event);
    emit("scrub", lastSeconds);
  }
}

function onPointerUp(event: PointerEvent): void {
  if (!start) {
    return;
  }
  const seconds = toSeconds(event);
  if (dragging) {
    emit("scrubEnd", seconds);
  } else {
    emit("seek", seconds);
  }
  start = null;
  dragging = false;
}

function onPointerCancel(): void {
  if (start && dragging) {
    emit("scrubEnd", lastSeconds);
  }
  start = null;
  dragging = false;
}
</script>

<template>
  <div
    ref="root"
    class="seekbar"
    role="slider"
    aria-label="再生位置"
    :aria-valuemin="0"
    :aria-valuemax="Math.round(duration)"
    :aria-valuenow="Math.round(position)"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <canvas ref="canvas" class="wave" />
    <span
      v-for="(label, row) in labels"
      :key="row"
      class="label"
      :style="{ top: `${row * (100 / ROWS)}%` }"
      >{{ label }}</span
    >
    <div class="head" :style="head" />
  </div>
</template>

<style scoped>
.seekbar {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 280px;
  border-bottom: 1px solid #d9d9d9;
  background: var(--color-white);
  cursor: pointer;
  /* 指でなぞってもページがスクロールしないようにする */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.wave {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.label {
  position: absolute;
  left: 4px;
  color: #888;
  font-size: 10px;
  line-height: 1.2;
  pointer-events: none;
}
.head {
  position: absolute;
  width: 2px;
  margin-left: -1px;
  background: #e5484d;
  pointer-events: none;
}
</style>
