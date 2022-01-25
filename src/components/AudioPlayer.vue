<template>
  <div class="audio-player">
    <div class="seek">
      <div class="time-current">{{ curretnTime | time }}</div>
      <input
        ref="rangeInput"
        class="bar"
        type="range"
        :value="curretnTime"
        :max="totalTime"
        @input="onSeekbarChange($event)"
      />
      <div class="loading" v-if="isLoading">
        <span></span>
      </div>
      <div class="time-total">{{ totalTime | time }}</div>
    </div>

    <div class="btns">
      <a
        class="common-btn repeat"
        :class="{ active: playMode == 1 }"
        @click="onClickPlayMode(1)"
      >
        <span class="icon material-icons">repeat_one</span>
      </a>

      <a
        class="common-btn shuffle"
        :class="{ active: playMode == 2 }"
        @click="onClickPlayMode(2)"
      >
        <span class="icon material-icons">shuffle</span>
      </a>

      <a class="common-btn prev" @click="onClickAudioBtn('prev')">
        <span class="icon material-icons">fast_rewind</span>
      </a>

      <a
        v-if="!isPlaying"
        class="common-btn play"
        @click="onClickAudioBtn('play')"
      >
        <span class="icon material-icons">play_arrow</span>
      </a>

      <a v-else class="common-btn pause" @click="onClickAudioBtn('pause')">
        <span class="icon material-icons">pause</span>
      </a>

      <a class="common-btn next" @click="onClickAudioBtn('next')">
        <span class="icon material-icons">fast_forward</span>
      </a>

      <a class="common-btn list" @click="onClickDisplayMode">
        <span class="icon material-icons">list</span>
      </a>

      <a class="common-btn search" @click="search()">
        <span class="icon material-icons">manage_search</span>
      </a>
    </div>
  </div>
</template>

<style scoped lang="scss">
$color-white: #fff;

.audio-player {
  box-sizing: border-box;
  padding: 12px;

  .seek {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 0 16px 0;

    .bar {
      width: 100%;
      margin: 0 8px;
      box-sizing: border-box;
    }

    .loading {
      position: absolute;
      top: -8px;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;

      span {
        display: block;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: solid 3px rgba(255, 255, 255, 0.5);
        border-top-color: rgba(255, 255, 255, 1);
        animation: spinner 800ms linear infinite;
      }
    }

    @keyframes spinner {
      to {
        transform: rotate(360deg);
      }
    }

    .time-current {
      font-size: 11px;
    }
    .time-total {
      font-size: 11px;
    }
  }

  .btns {
    display: flex;
    align-items: center;
    width: 100%;

    .repeat {
      margin-right: 4px;
      .icon {
        opacity: 0.4;
      }
      &.active .icon {
        opacity: 1;
      }
    }

    .shuffle {
      margin-right: auto;
      .icon {
        opacity: 0.4;
      }
      &.active .icon {
        opacity: 1;
      }
    }

    .play,
    .pause {
      //
      margin: 0 8px;
    }

    .list {
      margin-left: auto;
    }

    .search {
      margin-left: 4px;
    }
  }
}

.common-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  cursor: pointer;

  .icon {
    $size: 36px;
    width: $size;
    height: $size;
    line-height: $size;
    text-align: center;
    font-size: 28px;
  }
  &:hover {
    opacity: 0.8;
  }
  &:active {
    opacity: 0.6;
  }
}

.common-btn-dummy {
  $size: 36px;
  width: $size;
  height: $size;
}

.bar[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(#fff, #fff) no-repeat #ddd;
  background-size: 0 100%;
  height: 5px;
  width: 100%;
  border-radius: 6px;

  &:focus,
  &:active {
    outline: none;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
    position: relative;
    width: 22px;
    height: 22px;
    display: block;
    background-color: $color-white;
    border-radius: 50%;
    border: none;
    -webkit-border-radius: 50%;
  }

  &:active::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.6);
    transition: 0.4s;
  }
}
</style>

<script lang="ts">
import { Component, Emit, Vue } from "vue-property-decorator";
import {
  DisplayMode,
  FileData,
  PlayMode,
  TabIndex,
} from "@/interface/interface";
import { appState } from "@/state/app-state";
import { audioService } from "@/services/audio-service";
import { getDispText } from "@/utils/util";

@Component
export default class AudioPlayer extends Vue {
  curretnTime = 0;
  totalTime = 0;
  audioElm = document.createElement("audio");
  isPlaying = false;
  isLoading = false;
  get playMode(): PlayMode {
    return appState.playMode;
  }

  mounted(): void {
    this.audioElm.addEventListener("timeupdate", this.audioEventHandler);
    this.audioElm.addEventListener("loadedmetadata", this.audioEventHandler);
    this.audioElm.addEventListener("ended", this.audioEventHandler);
    this.audioElm.addEventListener("emptied", this.audioEventHandler);
    this.audioElm.addEventListener("progress", this.audioEventHandler);
    this.audioElm.addEventListener("loadstart", this.audioEventHandler);
    this.audioElm.addEventListener("loadeddata", this.audioEventHandler);
    this.audioElm.addEventListener("error", this.audioEventHandler);
    document.addEventListener("keydown", this.onKeyDown);
  }

  destroyed(): void {
    document.removeEventListener("keydown", this.onKeyDown);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key == " ") {
      if (this.isPlaying) {
        this.pause();
        this.$toasted.show("pause", {
          duration: 2200,
          position: "bottom-center",
        });
      } else {
        if (this.play()) {
          this.$toasted.show("play", {
            duration: 2200,
            position: "bottom-center",
          });
        }
      }
    }
  }

  audioEventHandler(e: Event): void {
    if (e.type === "timeupdate") {
      this.curretnTime = this.audioElm.currentTime;
    } else if (e.type === "loadedmetadata") {
      this.totalTime = this.audioElm.duration;
    } else if (e.type === "ended") {
      this.isPlaying = false;
      this.ended();
    } else if (e.type === "emptied") {
      (this.$refs.rangeInput as HTMLInputElement).style.backgroundSize =
        "0 100%";
    } else if (e.type === "progress") {
      this.isLoading = false;
      const loadedLength = this.audioElm.buffered.end(0);
      const percent = (loadedLength / this.audioElm.duration) * 100 + "% 100%";
      (this.$refs.rangeInput as HTMLInputElement).style.backgroundSize =
        percent;
    } else if (e.type === "loadstart") {
      this.isLoading = true;
    } else if (e.type === "loadeddata") {
      this.isLoading = false;
    } else if (e.type === "error") {
      this.$toasted.error("このファイルは再生できません", {
        duration: 2200,
        position: "bottom-center",
      });
      this.isLoading = false;
    }
  }

  onClickAudioBtn(type: "play" | "pause" | "next" | "prev"): void {
    if (type == "play") {
      this.play();
    } else if (type == "pause") {
      this.pause();
    } else if (type == "next") {
      this.next();
    } else if (type == "prev") {
      this.prev();
    }
  }

  play(fileData: FileData | null = null): boolean {
    if (fileData && fileData.webContentLink) {
      this.audioElm.src = fileData.webContentLink;
    }

    if (!this.audioElm.src) {
      return false;
    }

    this.audioElm.play().then(
      () => {
        //
      },
      () => {
        // 連続play時に起こるエラーを無視する
      }
    );

    if (fileData) {
      document.title = getDispText(fileData);
      console.log(document.title);
    }

    this.isPlaying = true;
    return true;
  }

  pause(): void {
    this.audioElm.pause();
    this.isPlaying = false;
  }

  prev(): void {
    const currentList = this.getCurrentList();
    const currentId = appState.playId;

    if (currentList.length == 0) {
      return;
    } else if (currentList.length == 1) {
      this.replay();
    }

    const currentIdx = currentList.findIndex((f) => f.id == currentId) || 0;
    let nextIdx = currentIdx - 1;
    if (nextIdx < 0) {
      nextIdx = currentList.length - 1;
    }

    const playFile = currentList[nextIdx];
    appState.playId = playFile.id;
    this.play(playFile);
  }

  next(): void {
    const currentList = this.getCurrentList();
    const currentId = appState.playId;
    const currentIdx = currentList.findIndex((f) => f.id == currentId) || 0;

    if (currentList.length == 0) {
      return;
    } else if (currentList.length == 1) {
      this.replay();
    }

    let nextIdx = 0;
    let playFile;
    if (appState.playMode == PlayMode.Shuffle) {
      const list = currentList.filter((f) => f.id != appState.playId);
      nextIdx = Math.floor(Math.random() * list.length);
      playFile = list[nextIdx];
    } else {
      nextIdx = currentIdx + 1;
      if (nextIdx >= currentList.length) {
        nextIdx = 0;
      }
      playFile = currentList[nextIdx];
    }

    appState.playId = playFile.id;
    this.play(playFile);
  }

  ended(): void {
    if (appState.playMode == PlayMode.Repeat) {
      this.replay();
    } else {
      this.next();
    }
  }

  replay(): void {
    this.audioElm.currentTime = 0;
    this.audioElm.play();
  }

  onSeekbarChange(e: InputEvent): void {
    this.audioElm.currentTime = Number((e.target as HTMLInputElement).value);
  }

  onClickPlayMode(mode: PlayMode): void {
    if (appState.playMode == mode) {
      appState.playMode = PlayMode.Default;
    } else {
      appState.playMode = mode;
    }
  }

  private onClickDisplayMode(): void {
    const currentMode = appState.displayMode;
    let mes = "";
    if (currentMode == DisplayMode.TitleArtist) {
      appState.displayMode = DisplayMode.Full;
      mes = "artist / album [track] - title";
    } else if (currentMode == DisplayMode.Full) {
      appState.displayMode = DisplayMode.FileName;
      mes = "file name";
    } else if (currentMode == DisplayMode.FileName) {
      appState.displayMode = DisplayMode.TitleArtist;
      mes = "title - artist";
    }

    audioService.playList.splice(0, 0);

    this.$toasted.show(mes, {
      duration: 2200,
      position: "bottom-center",
    });
  }

  private getCurrentList(): FileData[] {
    if (appState.lastClickListType == TabIndex.Drivelist) {
      return audioService.driveList;
    } else {
      return audioService.playList;
    }
  }

  @Emit()
  private search(): void {
    //
  }
}
</script>
