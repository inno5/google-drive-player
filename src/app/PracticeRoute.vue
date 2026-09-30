<script setup lang="ts">
import { PracticePage } from "@/features/practice";
import { usePlayerStore } from "@/features/player";
import { useTagStore } from "@/features/tags";

/**
 * 練習ビューのルート。メインで再生中の曲を引き継ぐ（入ったときの曲で固定。切り替えはメインで行う）。
 * 入場時にメインの再生は一時停止する。メインへ戻っても、自動では再開しない。
 */
const player = usePlayerStore();
const tags = useTagStore();

const song = player.current;
const title = song ? tags.displayName(song) : "";
player.pause();
</script>

<template>
  <PracticePage :song="song" :title="title" />
</template>
