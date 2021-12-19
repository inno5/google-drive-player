<template>
  <div class="page">
    <div class="audio-player-container">
      <audio-player class="audio-player" ref="audioPlayer"></audio-player>
    </div>
    <div class="file-list-container">
      <file-list class="file-list" @clickRow="onClickRow"></file-list>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/_variables";
.page {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;

  .audio-player-container {
    background-color: $color-main;
    color: $color-white;

    .audio-player {
      max-width: $app-max-width;
      margin: 0 auto;
    }
  }

  .file-list-container {
    height: 100%;

    .file-list {
      height: 100%;
      background-color: $color-white;
    }
  }
}
</style>

<script lang="ts">
import AudioPlayer from "@/components/AudioPlayer.vue";
import { authService } from "@/services/auth-service";
import Vue from "vue";
import Component from "vue-class-component";
import FileList from "@/components/FileList.vue";
import { FileData } from "@/interface/interface";

@Component({
  components: { AudioPlayer, FileList },
})
export default class MainPage extends Vue {
  onClickSignout(): void {
    authService.signout();
  }

  onClickRow(file: FileData): void {
    this.audioPlayer.play(file.webContentLink);
  }

  get audioPlayer(): AudioPlayer {
    return this.$refs.audioPlayer as AudioPlayer;
  }
}
</script>
