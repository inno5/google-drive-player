<template>
  <div class="app">
    <div class="app-header">
      <div class="title">
        <h1><router-link to="/">Google Drive Player</router-link></h1>
      </div>

      <div class="nav">
        <a
          @click="onClickSignout"
          v-if="isSignedIn"
          class="nav-link signout-button"
        >
          サインアウト
        </a>

        <a class="nav-link help-btn" @click="onClickHelp()">
          <span class="icon material-icons">help_outline</span>
        </a>
      </div>
    </div>

    <div class="app-audio">
      <div class="inner">
        <AudioPlayer
          ref="audioPlayer"
          @prev="play('prev')"
          @next="play('next')"
          @ended="play('next')"
          @search="searchList()"
          @list="changeDisplayMode()"
        ></AudioPlayer>
      </div>
    </div>

    <div class="app-signin" v-show="!isSignedIn">
      <div class="inner">
        <p class="note">
          これはGoogle Drive内の音楽を再生するアプリケーションです。
          まずはGoogleアカウントにサインインしてください。
        </p>
        <div class="btn" ref="googleSignInBtn"></div>
      </div>
    </div>

    <div class="app-nav" v-if="isSignedIn">
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

    <div class="app-body" v-if="isSignedIn">
      <div class="loading" v-if="addingToPlayList">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- ドライブ -->
      <div class="body-inner" :class="{ active: selectedTabIndex != 2 }">
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
                  <td class="cell-no">
                    {{ index }}
                  </td>
                  <td class="cell-title" @dblclick="onClickRow(file)">
                    <div class="text">
                      <span
                        v-if="
                          file.mimeType === 'application/vnd.google-apps.folder'
                        "
                        class="icon material-icons"
                      >
                        folder
                      </span>
                      <span v-else class="icon material-icons">audiotrack</span>
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
                  <td class="cell-no">
                    {{ index }}
                  </td>
                  <td class="cell-title" @dblclick="onClickRow(file, true)">
                    <div class="text">
                      <span
                        v-if="
                          file.mimeType === 'application/vnd.google-apps.folder'
                        "
                        class="icon material-icons"
                      >
                        folder
                      </span>
                      <span v-else class="icon material-icons">audiotrack</span>
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
                </tr>
              </draggable>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
body {
  margin: 0;
  padding: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #333;
}

a,
button {
  -ms-user-select: none; /* IE 10+ */
  -moz-user-select: -moz-none;
  -khtml-user-select: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>

<style lang="scss" scoped>
$color-main: #3bbec0;
$color-white: #fff;
$color-black: #333;

.app {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;

  .app-header {
    display: flex;
    align-items: center;
    padding: 12px 24px;
    @media screen and (max-width: 767px) {
      padding: 4px 12px;
    }

    background-color: $color-main;
    color: #fff;

    .title {
      a {
        display: block;
        padding: 8px 8px 8px 0;
        font-size: 16px;
        color: #fff;
        font-weight: bold;
        text-decoration: none;
        &:hover {
          opacity: 0.8;
        }
        &:active {
          opacity: 0.6;
        }
      }
    }

    .nav {
      display: flex;
      align-items: center;
      margin-left: auto;
      font-size: 12px;

      .nav-link {
        cursor: pointer;
        display: block;

        &:hover {
          opacity: 0.8;
        }
        &:active {
          opacity: 0.6;
        }

        &.signout-btn {
          padding: 8px 0 8px 8px;
        }

        &.help-btn {
          margin-left: 16px;
        }
      }
    }
  }

  .app-audio {
    background-color: $color-main;
    color: #fff;

    .inner {
      max-width: 568px;
      margin: 0 auto;
    }
  }

  .app-signin {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .inner {
      margin-top: -20%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .note {
        text-align: left;
        font-size: 12px;
        padding: 0 24px 24px 24px;
        line-height: 1.8;
      }

      .btn {
        text-align: center;
      }
    }
  }

  .app-nav {
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
    }
  }

  .app-body {
    display: flex;
    height: 100%;

    .body-inner {
      display: none;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
      &.active {
        display: flex;
      }

      &:first-child {
        background-color: darken($color-white, 5%);
      }

      .body-ctrl {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-height: 32px;
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
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;

          tr {
            &.sortable-ghost {
              background-color: rgba($color-main, 0.2);
            }

            &.playing {
              background-color: $color-main;
              color: $color-white;
              .cell-title {
                font-weight: bold;
              }
            }

            &:hover td {
              background: rgba($color-main, 0.1);
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
</style>

<script lang="ts">
import "reset.css";
import InfiniteLoading, { StateChanger } from "vue-infinite-loading";
import { Component, Vue, Watch } from "vue-property-decorator";
import draggable from "vuedraggable";
import { Env } from "./env/env";
import AudioPlayer from "./components/AudioPlayer.vue";
import { isFolder, isPC } from "./utils/util";
import { appService } from "./services/app-service";
import {
  FileData,
  PlayMode,
  TabIndex,
  DEFAULT_PARENT,
  DisplayMode,
} from "@/interface/interface";
import { audioService } from "./services/audio-service";
import { gapi } from "./services/gapi-service";

const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

// const hoge = process.env.npm_package_version;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION = require("../package.json").version;

@Component({
  components: {
    draggable,
    AudioPlayer,
  },
})
export default class App extends Vue {
  isPC = isPC();
  initialized = false;
  isSignedIn = false;
  driveList = audioService.driveList;
  playList = audioService.playList;
  nextPageToken = "";
  parent = DEFAULT_PARENT;
  lastListRequest: Promise<void> | null = null;
  playId = "";
  searchWord = "";
  addingToPlayList = false;
  selectedTabIndex = appService.getSelectedTabIndex();
  lastClickListType: "drive" | "playlist" = "drive";

  mounted(): void {
    if (this.$route.params.id) {
      this.parent = this.$route.params.id;
    }

    if (this.$route.params.searchWord) {
      this.searchWord = this.$route.params.searchWord;
    }

    this.driveList.splice(0, this.driveList.length);
    this.init();
  }

  init(): void {
    gapi.load("client:auth2", () => {
      gapi.client
        .init({
          apiKey: Env.GCP_API_KEY,
          clientId: Env.GCP_OAUTH2_CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES,
        })
        .then(
          () => {
            // サインインボタン表示
            this.renderSignInButton();

            gapi.auth2
              .getAuthInstance()
              .isSignedIn.listen(this.updateSigninStatus);
            this.updateSigninStatus(
              gapi.auth2.getAuthInstance().isSignedIn.get()
            );
            this.initialized = true;

            audioService.updateTags();
          },
          (err: Error) => {
            console.log(err);
          }
        );
    });
  }

  renderSignInButton(): void {
    gapi.signin2.render(this.$refs.googleSignInBtn, {
      scope: "profile email",
      width: 180,
      height: 40,
      longtitle: true,
      theme: "dark",
    });
  }

  updateSigninStatus(isSignedIn: boolean): void {
    this.isSignedIn = isSignedIn;
    if (isSignedIn) {
      const token = gapi.auth2
        .getAuthInstance()
        .currentUser.get()
        .getAuthResponse().access_token;

      appService.setGoogleOAuthAccessToken(token);
    } else {
      this.clearDriveList();
    }
  }

  onClickHelp(): void {
    alert(`Google Drive Player\n${APP_VERSION}`);
  }

  onClickSignout(): void {
    gapi.auth2
      .getAuthInstance()
      .signOut()
      .then(() => {
        this.isSignedIn = false;
        this.clearDriveList();
        appService.clearAllData();
        this.parent = DEFAULT_PARENT;
        if (this.$router.currentRoute.path != "/") {
          this.$router.push({ path: `/` });
        }
      });
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
          this.searchInputElm.blur();
          this.$router.push({ path: `/search/${this.searchInputElm.value}` });
        }
      }
    }
  }

  play(type: "next" | "prev"): void {
    if (!this.playId) {
      return;
    }

    // リピートの場合
    if (appService.getPlayMode() == PlayMode.Repeat) {
      this.audioPalyer.replay();
      return;
    }

    const targetList =
      this.lastClickListType === "drive" ? this.driveList : this.playList;

    if (targetList.length === 0) {
      return;
    }

    const targetFiles = targetList.filter((f) => !isFolder(f));
    const currentIndex = targetList.findIndex((f) => f.id === this.playId) || 0;

    let nextIndex = 0;
    if (type === "prev") {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = targetFiles.length - 1;
      }
    } else {
      if (appService.getPlayMode() == PlayMode.Shuffle) {
        // シャッフルの場合
        nextIndex = Math.floor(Math.random() * targetFiles.length);
      } else {
        nextIndex = currentIndex + 1;
        if (nextIndex > targetFiles.length - 1) {
          nextIndex = 0;
        }
      }
    }

    const nextFile = targetFiles[nextIndex];
    this.playId = nextFile.id;
    this.audioPalyer.play(nextFile.webContentLink);
  }

  async infiniteHandler(stateChanger: StateChanger): Promise<void> {
    if (!this.isSignedIn) {
      return;
    }

    await audioService.loadDriveList(
      this.searchWord,
      this.parent,
      stateChanger
    );
  }

  clearDriveList(): void {
    this.infiniteStateChanger?.reset();
    audioService.clearDriveList();
  }

  searchList(): void {
    const elms = document.querySelectorAll(".tr-" + this.playId);
    elms.forEach((element) => {
      element.scrollIntoView({
        behavior: "auto",
        block: "center",
      });
    });
  }

  changeDisplayMode(): void {
    if (this.playList.length == 0) {
      return;
    }

    const current = appService.getDisplayMode();
    let mes = "";

    if (current == DisplayMode.TitleArtist) {
      appService.setDisplayMode(DisplayMode.Full);
      mes = "artist / album [track] - title";
    } else if (current == DisplayMode.Full) {
      appService.setDisplayMode(DisplayMode.FileName);
      mes = "file name";
    } else if (current == DisplayMode.FileName) {
      appService.setDisplayMode(DisplayMode.TitleArtist);
      mes = "artist - title";
    } else {
      return;
    }
    this.$toasted.show(mes, {
      duration: 2500,
      position: "bottom-center",
    });

    this.playList.splice(0, 0);
  }

  onClickRow(file: FileData, isPlayListRow = false): void {
    if (isFolder(file)) {
      this.$router.push({ path: `/${file.id}` });
    } else {
      this.lastClickListType = isPlayListRow ? "playlist" : "drive";

      if (this.playId === file.id) {
        this.audioPalyer.replay();
      } else {
        if (file.webContentLink) {
          this.playId = file.id;
          this.audioPalyer.play(file.webContentLink);
        }
      }
    }

    audioService.updateTags();
  }

  onClickTab(idx: TabIndex): void {
    if (this.selectedTabIndex == idx) {
      this.selectedTabIndex = TabIndex.Both;
    } else {
      this.selectedTabIndex = idx;
    }

    appService.setSelectedTabIndex(this.selectedTabIndex);

    if (this.driveList.length == 0) {
      const elm = this.$refs.infiniteLoading as InfiniteLoading;
      this.infiniteHandler(elm.stateChanger);
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

  onEndDragPlayList(e: any) {
    if (e.newIndex != e.oldIndex) {
      appService.savePlayList(this.playList);
    }
  }

  getDispText(file: FileData): string {
    const meta = appService.getAudioMeta(file.id);
    const currentDisplayMode = appService.getDisplayMode();
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

  @Watch("$route.params.id")
  onParentChange(): void {
    this.parent = this.$route.params.id || DEFAULT_PARENT;
    this.clearDriveList();
  }

  @Watch("$route.params.searchWord")
  onSearchWordChange(): void {
    this.searchWord = this.$route.params.searchWord || "";
    this.clearDriveList();
  }

  get infiniteStateChanger(): StateChanger | null {
    const elm = this.$refs.infiniteLoading as InfiniteLoading;
    if (elm) {
      return elm.stateChanger;
    }

    return null;
  }

  get audioPalyer(): AudioPlayer {
    const elm = this.$refs.audioPlayer as AudioPlayer;
    return elm;
  }

  get searchInputElm(): HTMLInputElement {
    const elm = this.$refs.searchInput as HTMLInputElement;
    return elm;
  }
}
</script>
