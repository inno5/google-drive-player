<template>
  <div class="file-list">
    <div class="list-nav">
      <div
        class="nav-tab"
        @click="onClickTab(1)"
        :class="{ active: selectedTabIndex != 2 }"
      >
        <span class="text">Google Drive</span>
      </div>
      <div
        class="nav-tab"
        @click="onClickTab(2)"
        :class="{ active: selectedTabIndex != 1 }"
      >
        <span class="text">Playlist</span>
      </div>
    </div>

    <div class="list-body" :class="{ 'two-column': selectedTabIndex == 0 }">
      <div class="loading" v-if="addingToPlayList">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- ドライブ -->
      <div
        class="body-inner"
        :class="{ active: selectedTabIndex != 2 }"
        ref="driveListElm"
      >
        <div class="body-ctrl">
          <div class="search">
            <input
              type="text"
              class="search-input"
              placeholder="Search audio driveList"
              ref="searchInput"
              v-model="searchWord"
              @keydown="onKeyDownSearch($event)"
            />
            <div class="search-icon">
              <span class="icon material-icons">search</span>
            </div>
          </div>
        </div>

        <div class="body-list">
          <div class="body-list-inner" ref="driveListContainer">
            <table class="file-list-table">
              <draggable
                tag="tbody"
                v-model="driveList"
                :delay="isPC ? 0 : 100"
                :animation="200"
              >
                <tr
                  v-for="(file, index) in driveList"
                  :key="file.id"
                  :class="['tr-' + file.id, { playing: file.id == playId }]"
                >
                  <div class="tr-inner" v-tooltip="file.name">
                    <td class="cell-no">
                      {{ index }}
                    </td>
                    <td class="cell-title" @dblclick="onClickRow(file)">
                      <div class="text">
                        <span
                          v-if="
                            file.mimeType ===
                            'application/vnd.google-apps.folder'
                          "
                          class="icon material-icons"
                        >
                          folder
                        </span>
                        <span v-else class="icon material-icons">
                          audiotrack
                        </span>
                        <span>{{ file.name }}</span>
                      </div>
                    </td>
                    <td class="cell-size">{{ file.size | prettyBytes }}</td>
                    <td class="cell-ctrl">
                      <a class="common-btn" @click="onClickAddToPlayList(file)">
                        <span class="icon material-icons">
                          add_circle_outline
                        </span>
                      </a>
                    </td>
                  </div>
                </tr>
              </draggable>
            </table>
            <infinite-loading
              @infinite="infiniteHandler"
              ref="infiniteLoading"
            ></infinite-loading>
          </div>
        </div>
      </div>

      <!-- プレイリスト -->
      <div class="body-inner" :class="{ active: selectedTabIndex != 1 }">
        <div class="body-ctrl">
          <div class="playlist-ctrl">
            <a class="common-btn" @click="onClickClearPlayList()">
              <span class="text">Remove All</span>
              <span class="icon material-icons">delete_outline</span>
            </a>
          </div>
        </div>

        <div class="body-list">
          <div class="body-list-inner" ref="playListContainer">
            <div
              v-if="!playList || playList.length == 0"
              class="infinite-status-prompt"
              style="
                color: rgb(102, 102, 102);
                font-size: 14px;
                padding: 10px 0px;
              "
            >
              No data :)
            </div>

            <table class="file-list-table table table-striped table-hover">
              <draggable
                tag="tbody"
                v-model="playList"
                :delay="isPC ? 0 : 100"
                :animation="200"
                @end="onEndDragPlayList($event)"
              >
                <tr
                  v-for="(file, index) in playList"
                  :key="file.id"
                  :class="['tr-' + file.id, { playing: file.id == playId }]"
                >
                  <div class="tr-inner" v-tooltip="getDispText(file)">
                    <td class="cell-no">
                      {{ index }}
                    </td>
                    <td class="cell-title" @dblclick="onClickRow(file, true)">
                      <div class="text">
                        <span
                          v-if="
                            file.mimeType ===
                            'application/vnd.google-apps.folder'
                          "
                          class="icon material-icons"
                        >
                          folder
                        </span>
                        <span v-else class="icon material-icons">
                          audiotrack
                        </span>
                        <span>{{ getDispText(file) }}</span>
                      </div>
                    </td>
                    <td class="cell-size">{{ file.size | prettyBytes }}</td>
                    <td class="cell-ctrl">
                      <a
                        class="common-btn"
                        @click="onClickRemoveFromPlayList(file)"
                      >
                        <span class="icon material-icons">delete_outline</span>
                      </a>
                    </td>
                  </div>
                </tr>
              </draggable>
            </table>
          </div>
        </div>
      </div>

      <div class="divider" ref="dividerElm" draggable="true"></div>
      <!-- @dragstart="dividerDragHandler($event)"
        @drag="dividerDragHandler($event)"
        @dragend="dividerDragHandler($event)" -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "@/styles/_variables";

.file-list {
  display: flex;
  flex-direction: column;

  .list-nav {
    display: flex;
    .nav-tab {
      box-sizing: border-box;
      width: 50%;
      padding: 12px 0;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;

      color: $color-white;
      background-color: darken($color-main, 10%);

      &.active {
        color: $color-black;
        background-color: $color-white;

        &:first-child {
          background-color: darken($color-white, 5%);
        }
      }

      &:hover .text {
        opacity: 0.8;
      }

      &:active .text {
        opacity: 0.6;
      }

      .text {
        display: block;
        max-width: $app-max-width / 2;
      }

      &:first-child {
        .text {
          margin-left: auto;
        }
      }
    }
  }

  .list-body {
    position: relative;
    display: flex;
    height: 100%;

    &.two-column {
      .body-inner {
        &:nth-child(1) {
          .body-ctrl,
          .infinite-loading-container,
          .infinite-status-prompt,
          .tr-inner {
            max-width: $app-max-width / 2 !important;
            margin-right: 0 !important;
            margin-left: auto;
          }
        }

        &:nth-child(2) {
          .body-ctrl,
          .infinite-loading-container,
          .infinite-status-prompt,
          .tr-inner {
            max-width: $app-max-width / 2 !important;
            margin-left: 0 !important;
            margin-right: auto;
          }
        }
      }
    }

    .divider {
      display: none;
      // position: absolute;
      // left: calc(50% - 6px);
      // width: 12px;
      // height: 100%;
      // cursor: col-resize;
      // background-color: red;
    }

    .body-inner {
      display: none;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
      &.active {
        display: flex;
      }

      &:first-child {
        background-color: $color-gray;
      }

      .body-ctrl {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-height: 32px;
        width: 100%;
        max-width: $app-max-width;
        margin: 0 auto;
        padding: 12px;
        box-sizing: border-box;

        .playlist-ctrl {
          padding-top: 4px;
        }

        .search {
          position: relative;
          width: 100%;

          .search-input {
            display: block;
            width: 100%;
            height: 32px;
            padding-left: 28px;
            box-sizing: border-box;
            font-size: 16px;
            border: solid 2px #fff;
            -webkit-appearance: none;
            &::placeholder {
              color: #ccc;
            }

            &:focus {
              border: solid 2px $color-main;
              outline: none;
            }
          }

          .search-icon {
            position: absolute;
            top: 0;
            left: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.5;
          }
        }
      }

      .body-list {
        position: relative;
        height: 100%;

        .body-list-inner {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          left: 0;
          overflow-y: scroll;
          padding-bottom: 24px;
        }

        .file-list-table {
          width: 100%;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;

          tr {
            &.sortable-ghost {
              background-color: rgba($color-main, 0.2);
            }
            &:hover {
              background: rgba($color-main, 0.1);
            }
            &.playing {
              background-color: $color-main;
              color: $color-white;
              .cell-title {
                font-weight: bold;
              }
            }

            .tr-inner {
              max-width: $app-max-width;
              margin: 0 auto;
            }
          }

          td {
            text-align: left;
            font-size: 12px;
            vertical-align: middle;
            padding: 4px 0;

            span {
              vertical-align: middle;
            }
          }

          .cell-no {
            white-space: nowrap;
            text-align: right;
            padding: 0 8px 0 12px;
          }

          .cell-title {
            width: 100%;
            max-width: 0;
            cursor: pointer;

            .icon {
              font-size: 18px;
            }

            .text {
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }
          }
          .cell-size {
            white-space: nowrap;
            text-align: right;
            padding: 0 8px;
            color: rgba($color-black, 0.6);
          }
          .cell-ctrl {
            padding-right: 12px;
            cursor: pointer;
          }
        }
      }
    }
  }

  .common-btn {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    .text {
      font-size: 12px;
      padding-left: 8px;
    }

    .icon {
      $size: 28px;
      width: $size;
      height: $size;
      line-height: $size;
      text-align: center;
    }
    &:hover .text {
      text-decoration: underline;
    }
    &:active {
      opacity: 0.6;
    }
  }
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(#fff, 0.8);
  z-index: 1000;
}
</style>

<script lang="ts">
import "reset.css";
import { Component, Vue, Watch } from "vue-property-decorator";
import { appState } from "@/state/app-state";
import draggable from "vuedraggable";
import {
  DEFAULT_PARENT,
  DisplayMode,
  FileData,
  TabIndex,
} from "@/interface/interface";
import { isFolder, isPC } from "@/utils/util";
import InfiniteLoading, { StateChanger } from "vue-infinite-loading";
import { audioService } from "@/services/audio-service";

@Component({
  components: {
    draggable,
  },
})
export default class FileList extends Vue {
  searchWord = "";
  addingToPlayList = false;
  isPC = isPC();
  driveList = audioService.driveList;
  playList = audioService.playList;
  parent = DEFAULT_PARENT;
  get selectedTabIndex(): TabIndex {
    return appState.selectedTabIndex;
  }
  get playId(): string {
    return appState.playId;
  }

  created(): void {
    this.parent = this.$route.params.id || DEFAULT_PARENT;
    this.searchWord = this.$route.params.searchWord || "";
    audioService.updateTags();
  }

  onClickTab(idx: TabIndex): void {
    if (appState.selectedTabIndex == idx) {
      appState.selectedTabIndex = TabIndex.Both;
    } else {
      appState.selectedTabIndex = idx;
    }

    if (this.driveList.length == 0) {
      const elm = this.$refs.infiniteLoading as InfiniteLoading;
      this.infiniteHandler(elm.stateChanger);
    }
  }

  onClickRow(file: FileData, isPlayListRow = false): void {
    if (isFolder(file)) {
      this.$router.push({ path: `/d/${file.id}` });
    } else {
      appState.lastClickListType = isPlayListRow
        ? TabIndex.Playlist
        : TabIndex.Drivelist;
      appState.playId = file.id;
      this.$emit("clickRow", file);
    }
    audioService.updateTags();
  }

  onEndDragPlayList(e: { newIndex: number; oldIndex: number }): void {
    if (e.newIndex != e.oldIndex) {
      appState.savePlayList(this.playList);
    }
  }

  onKeyDownSearch(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.isComposing) {
      if (this.$route.params.searchWord != this.searchWord) {
        if (this.searchWord == "") {
          this.searchInputElm.blur();
          if (this.$router.currentRoute.path != "/") {
            this.$router.push({ path: `/` });
          }
        } else {
          const newSearchWord = encodeURIComponent(this.searchInputElm.value);
          this.searchInputElm.blur();
          this.$router.push({ path: `/search/${newSearchWord}` });
        }
      }
    }
  }

  async onClickAddToPlayList(file: FileData): Promise<void> {
    this.addingToPlayList = true;
    await audioService.addToPlayList(file);
    this.addingToPlayList = false;
  }

  onClickRemoveFromPlayList(file: FileData): void {
    audioService.removeFromPlayList(file);
  }

  onClickClearPlayList(): void {
    audioService.clearPlayList();
  }

  // dragStartX = 0;
  // dividerDragHandler(event: DragEvent): void {
  //   if (event.type == "dragstart") {
  //     this.dragStartX = event.screenX;
  //     console.log(Math.random());
  //   } else {
  //     const moveX = event.screenX - this.dragStartX;
  //     (
  //       this.$refs.driveListElm as HTMLElement
  //     ).style.width = `calc(50% + ${moveX}px)`;
  //     (
  //       this.$refs.dividerElm as HTMLElement
  //     ).style.left = `calc(50% - 6px + ${moveX}px)`;
  //   }
  // }

  async infiniteHandler(stateChanger: StateChanger): Promise<void> {
    await audioService.loadDriveList(
      this.searchWord,
      this.parent,
      stateChanger
    );
  }

  getDispText(file: FileData): string {
    const meta = audioService.getAudioMeta(file.id);
    const currentDisplayMode = appState.displayMode;
    // 0: number; // modifiedTime to unix time ms
    // 1: string; // tag-artist
    // 2: string; // tag-title
    // 3: string; // tag-album
    // 4: string; // tag-track
    if (
      !meta ||
      !meta[1] ||
      !meta[2] ||
      currentDisplayMode == DisplayMode.FileName
    ) {
      return file.name;
    } else if (currentDisplayMode == DisplayMode.TitleArtist) {
      return `${meta[2]} - ${meta[1]}`;
    } else if (currentDisplayMode == DisplayMode.Full) {
      let str = "";
      if (meta[1]) {
        str += meta[1];
        if (meta[3]) {
          str += " / ";
        }
      }
      if (meta[3]) {
        str += meta[3];
        if (meta[4]) {
          str += ` [${meta[4]}]`;
        }
      }
      if (meta[1] || meta[3]) {
        str += " - ";
      }
      str += meta[2];
      return str;
    } else {
      return file.name;
    }
  }

  // パラメータが変わったらドライブのリストを再読み込み
  @Watch("$route.params.id")
  onParentChange(): void {
    this.parent = this.$route.params.id || DEFAULT_PARENT;
    this.clearDriveList();
  }

  // パラメータが変わったらドライブのリストを再読み込み
  @Watch("$route.params.searchWord")
  onSearchWordChange(): void {
    this.searchWord = this.$route.params.searchWord || "";
    this.clearDriveList();
  }

  clearDriveList(): void {
    this.infiniteStateChanger?.reset();
    audioService.clearDriveList();
  }

  get infiniteStateChanger(): StateChanger | null {
    const elm = this.$refs.infiniteLoading as InfiniteLoading;
    if (elm) {
      return elm.stateChanger;
    }

    return null;
  }

  get searchInputElm(): HTMLInputElement {
    const elm = this.$refs.searchInput as HTMLInputElement;
    return elm;
  }
}
</script>
