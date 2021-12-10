<template>
  <div class="container">
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
        @click="onClickRepeat()"
      >
        <span class="icon material-icons">repeat_one</span>
      </a>

      <a
        class="common-btn shuffle"
        :class="{ active: playMode == 2 }"
        @click="onClickShuffle()"
      >
        <span class="icon material-icons">shuffle</span>
      </a>

      <a class="common-btn prev" @click="prev()">
        <span class="icon material-icons">fast_rewind</span>
      </a>

      <a v-if="!isPlaying" class="common-btn play" @click="play()">
        <span class="icon material-icons">play_arrow</span>
      </a>
      <a v-else class="common-btn pause" @click="pause()">
        <span class="icon material-icons">pause</span>
      </a>

      <a class="common-btn next" @click="next()">
        <span class="icon material-icons">fast_forward</span>
      </a>

      <span class="common-btn-dummy dummy"></span>

      <a class="common-btn search" @click="search()">
        <span class="icon material-icons">manage_search</span>
      </a>
    </div>
  </div>
</template>

<style scoped lang="scss">
$color-white: #fff;

.container {
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

    .dummy {
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
import { appService } from "@/services/app-service";
import { PlayMode } from "@/interface/interface";

@Component
export default class AudioPlayer extends Vue {
  curretnTime = 0;
  totalTime = 0;
  audioElm = document.createElement("audio");
  isPlaying = false;
  isLoading = false;
  playMode = appService.getPlayMode();

  mounted(): void {
    //
    this.audioElm.addEventListener("timeupdate", this.audioEventHandler);
    this.audioElm.addEventListener("loadedmetadata", this.audioEventHandler);
    this.audioElm.addEventListener("ended", this.audioEventHandler);
    this.audioElm.addEventListener("emptied", this.audioEventHandler);
    this.audioElm.addEventListener("progress", this.audioEventHandler);
    this.audioElm.addEventListener("loadstart", this.audioEventHandler);
    this.audioElm.addEventListener("loadeddata", this.audioEventHandler);
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
    }
  }

  play(src = ""): void {
    if (src) {
      this.audioElm.src = src;
    }

    if (!this.audioElm.src) {
      return;
    }

    this.audioElm.play().then(
      () => {
        //
      },
      () => {
        // 連続play時に起こるエラーを無視する
      }
    );
    this.isPlaying = true;
  }

  pause(): void {
    this.audioElm.pause();
    this.isPlaying = false;
  }

  replay(): void {
    this.audioElm.currentTime = 0;
    this.audioElm.play();
  }

  onSeekbarChange(e: InputEvent): void {
    this.audioElm.currentTime = Number((e.target as HTMLInputElement).value);
  }

  onClickRepeat(): void {
    const mode = PlayMode.Repeat;
    this.playMode = mode;
    appService.setPlayMode(mode);
  }

  onClickShuffle(): void {
    const mode = PlayMode.Shuffle;
    this.playMode = mode;
    appService.setPlayMode(mode);
  }

  @Emit()
  prev(): void {
    //
  }

  @Emit()
  next(): void {
    //
  }

  @Emit()
  ended(): void {
    //
  }

  @Emit()
  search(): void {
    //
  }
}
</script>
