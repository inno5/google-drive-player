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
        @click="onClickTab('drive')"
        :class="{ active: currentTab != 'playlist' }"
      >
        <span class="text">Google Drive</span>
      </div>
      <div
        class="nav-tab"
        @click="onClickTab('playlist')"
        :class="{ active: currentTab != 'drive' }"
      >
        <span class="text">Local Playlist</span>
      </div>
    </div>

    <div class="app-body" v-if="isSignedIn">
      <div class="loading" v-if="addingToPlayList">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- ドライブ -->
      <div class="body-inner" :class="{ active: currentTab != 'playlist' }">
        <div class="body-ctrl">
          <div class="search">
            <input
              type="text"
              class="search-input"
              placeholder="Search audio files"
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
                v-model="files"
                :delay="isPC ? 0 : 100"
                :animation="200"
              >
                <tr
                  v-for="(file, index) in files"
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
                    <a class="common-btn" @click="addToPlayList($event, file)">
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
      <div class="body-inner" :class="{ active: currentTab != 'drive' }">
        <div class="body-ctrl playlist">
          <a class="common-btn" @click="clearPlayList()">
            <span class="text">Remove All</span>
            <span class="icon material-icons">delete_outline</span>
          </a>
        </div>

        <div class="body-list">
          <div class="body-list-inner" ref="playListContainer">
            <div
              v-if="!playListFiles || playListFiles.length == 0"
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
                v-model="playListFiles"
                :delay="isPC ? 0 : 100"
                :animation="200"
              >
                <tr
                  v-for="(file, index) in playListFiles"
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
                      <span>{{ file.name }}</span>
                    </div>
                  </td>
                  <td class="cell-size">{{ file.size | prettyBytes }}</td>
                  <td class="cell-ctrl">
                    <a
                      class="common-btn"
                      @click="removeFromPlayList($event, file)"
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

        &.playlist {
          padding-top: 12 + 4px;
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
              // background-color: rgba($color-main, 0.5);
              background-color: $color-main;
              color: $color-white;
              .cell-title {
                font-weight: bold;
              }
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
import { isPC } from "./utils/util";
import jsmediatags from "jsmediatags";

const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

const DEFAULT_PARENT = "root";
const LS_KEY_PLAY_LIST = "ls-key-play-list";

let gapi: any = null;

interface File {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: number;
  webContentLink?: string;
  parents: string[];
}

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
  files: File[] = [];
  playListFiles: File[] = [];
  nextPageToken = "";
  parent = DEFAULT_PARENT;
  lastListRequest: Promise<void> | null = null;
  playId = "";
  searchWord = "";
  addingToPlayList = false;
  currentTab: "drive" | "playlist" | "" = "";
  lastClickListType: "drive" | "playlist" = "drive";
  googleOAuthAccessToken = ";";

  mounted(): void {
    gapi = (window as any).gapi;

    if (this.$route.params.id) {
      this.parent = this.$route.params.id;
    }

    if (this.$route.params.searchWord) {
      this.searchWord = this.$route.params.searchWord;
    }

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
          },
          (err: Error) => {
            console.log(err);
          }
        );
    });
  }

  play(type: "next" | "prev"): void {
    if (!this.playId) {
      return;
    }

    // リピートの場合
    if (this.audioPalyer.isRepeatMode) {
      this.audioPalyer.replay();
      return;
    }

    const targetList =
      this.lastClickListType === "drive" ? this.files : this.playListFiles;

    if (targetList.length === 0) {
      return;
    }

    const targetFiles = targetList.filter((f) => !this.isFolder(f));
    const currentIndex = targetList.findIndex((f) => f.id === this.playId) || 0;

    let nextIndex = 0;
    if (type === "prev") {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = targetFiles.length - 1;
      }
    } else {
      if (this.audioPalyer.isShuffleMode) {
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
      this.googleOAuthAccessToken = gapi.auth2
        .getAuthInstance()
        .currentUser.get()
        .getAuthResponse().access_token;
      this.restorePlayList();
    } else {
      this.files = [];
    }
  }

  onClickHelp(): void {
    alert("Google Drive Player\nv1.0.0");
  }

  onClickSignout(): void {
    gapi.auth2
      .getAuthInstance()
      .signOut()
      .then(() => {
        this.resetList();
        this.parent = DEFAULT_PARENT;
        if (this.$router.currentRoute.path != "/") {
          this.$router.push({ path: `/` });
        }
        window.localStorage.removeItem(LS_KEY_PLAY_LIST);
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

  listFiles(stateChanger: StateChanger): void {
    let query = `(mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'audio/') and trashed = false`;
    if (this.searchWord) {
      query += ` and name contains '${this.searchWord}'`;
    } else {
      query += ` and '${this.parent}' in parents`;
    }

    const req: Promise<any> = gapi.client.drive.files
      .list({
        pageSize: 100,
        fields:
          "nextPageToken, files(id, name, size, mimeType, parents, modifiedTime, webContentLink)",
        pageToken: this.nextPageToken,
        orderBy: "folder asc, name asc",
        q: query,
      })
      .then(
        (response: any) => {
          if (req !== this.lastListRequest) {
            return;
          }

          this.files = this.files.concat(response.result.files);
          stateChanger.loaded();

          if (response.result.nextPageToken) {
            this.nextPageToken = response.result.nextPageToken;
          } else {
            this.nextPageToken = "";
            stateChanger.complete();
          }

          var files = response.result.files;
          if (files && files.length > 0) {
            //
          } else {
            // nofile
          }
        },
        (err: Error) => {
          console.log(err);
        }
      );
    this.lastListRequest = req;
  }

  async loadFilesIncludeSubFolder(folderIds: string[] | null = null) {
    const result = await this._loadFilesIncludeSubFolder(folderIds);
    result.sort((a, b) => {
      if (a.parents[0] != b.parents[0]) {
        return 1;
      }

      return parseInt(a.name) - parseInt(b.name);
    });
    return result;
  }

  async _loadFilesIncludeSubFolder(
    folderIds: string[] | null = null
  ): Promise<File[]> {
    const promise = new Promise<File[]>((resolve) => {
      let query = `(mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'audio/') and trashed = false`;
      if (folderIds && folderIds.length > 0) {
        query += " and (";
        query += folderIds.map((id) => `'${id}' in parents`).join(" or ");
        query += ")";
      } else {
        query += ` and '${DEFAULT_PARENT}' in parents`;
      }

      gapi.client.drive.files
        .list({
          pageSize: 1000,
          fields:
            "nextPageToken, files(id, name, size, mimeType, parents, modifiedTime,webContentLink)",
          orderBy: "folder",
          q: query,
        })
        .then(
          async (response: any) => {
            const fIds = (response.result.files as File[]).reduce(
              (acc: string[], f: File) => {
                if (this.isFolder(f)) {
                  acc.push(f.id);
                }
                return acc;
              },
              []
            );

            let filesInFolder: File[] = [];
            if (fIds.length > 0) {
              while (fIds.length > 0) {
                const result = await this._loadFilesIncludeSubFolder(
                  fIds.splice(0, 50)
                ).catch(() => []);
                filesInFolder = filesInFolder.concat(result);
              }
            }
            const filesInCurrent = (response.result.files as File[]).filter(
              (f) => !this.isFolder(f)
            );

            resolve(filesInFolder.concat(filesInCurrent));
          },
          () => {
            resolve([]);
          }
        );
    });

    return promise;
  }

  infiniteHandler(stateChanger: StateChanger): void {
    if (!this.isSignedIn) {
      return;
    }
    this.listFiles(stateChanger);
  }

  resetList(): void {
    this.files = [];
    this.infiniteStateChanger.reset();
    this.nextPageToken = "";
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

  onClickRow(file: File, isPlayListRow = false): void {
    if (this.isFolder(file)) {
      this.$router.push({ path: `/${file.id}` });
    } else {
      this.lastClickListType = isPlayListRow ? "playlist" : "drive";

      if (this.playId === file.id) {
        this.audioPalyer.replay();
      } else {
        if (file.webContentLink) {
          this.playId = file.id;

          // TEST
          // get ID3 tag
          // const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
          // jsmediatags.Config.setRequestHeaders([
          //   {
          //     key: "Authorization",
          //     value: `Bearer ${this.googleOAuthAccessToken}`,
          //   },
          // ]);

          // jsmediatags.read(url, {
          //   onSuccess: (tag: any) => {
          //     console.log(tag);
          //   },
          //   onError: (error: any) => {
          //     console.log(error);
          //   },
          // });

          // play
          this.audioPalyer.play(file.webContentLink);
        }
      }
    }
  }

  onClickTab(type: "drive" | "playlist" | ""): void {
    if (this.currentTab == type) {
      this.currentTab = "";
    } else {
      this.currentTab = type;
    }
  }

  async addToPlayList(e: Event, file: File): Promise<void> {
    e.stopPropagation();
    e.preventDefault();

    if (this.isFolder(file)) {
      this.addingToPlayList = true;
      const files = await this.loadFilesIncludeSubFolder([file.id]).catch(
        () => []
      );
      files.forEach((f) => {
        const idx = this.playListFiles.findIndex((plf) => plf.id === f.id);
        if (idx === -1) {
          this.playListFiles.push(f);
        }
      });
      this.addingToPlayList = false;
    } else {
      const idx = this.playListFiles.findIndex((plf) => plf.id === file.id);
      if (idx === -1) {
        this.playListFiles.push(file);
      }
    }

    this.savePlayList();
  }

  removeFromPlayList(e: Event, file: File): void {
    e.stopPropagation();
    e.preventDefault();

    const idx = this.playListFiles.findIndex((f) => f.id === file.id);
    if (idx >= 0) {
      this.playListFiles.splice(idx, 1);
    }

    this.savePlayList();
  }

  clearPlayList(): void {
    this.playListFiles = [];
    this.savePlayList();
  }

  savePlayList(): void {
    const jsonStr = JSON.stringify(this.playListFiles);
    window.localStorage.setItem(LS_KEY_PLAY_LIST, jsonStr);
  }

  restorePlayList(): void {
    const jsonStr = window.localStorage.getItem(LS_KEY_PLAY_LIST) || "[]";
    this.playListFiles = JSON.parse(jsonStr);
  }

  @Watch("$route.params.id")
  onParentChange(): void {
    this.parent = this.$route.params.id || DEFAULT_PARENT;
    this.resetList();
  }

  @Watch("$route.params.searchWord")
  onSearchWordChange(): void {
    this.searchWord = this.$route.params.searchWord || "";
    this.resetList();
  }

  isFolder(file: File): boolean {
    return file.mimeType === "application/vnd.google-apps.folder";
  }

  get infiniteStateChanger(): StateChanger {
    const elm = this.$refs.infiniteLoading as InfiniteLoading;
    return elm.stateChanger;
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
