import {
  DisplayMode,
  FileData,
  PlayMode,
  TabIndex,
} from "@/interface/interface";
import Vue from "vue";

enum LSKey {
  AppSettings = "ls-key-app-setting",
  PlayMode = "ls-key-play-mode",
  DisplayMode = "ls-key-display-mode",
  SelectedTabIndex = "ls-key-selected-tab-index",
  AudioMetas = "ls-key-audio-metas",
  PlayList = "ls-key-play-list",
}

class AppState {
  /**
   * サインイン状態
   */
  private _isSignedIn = false;

  get isSignedIn() {
    return this._isSignedIn;
  }

  set isSignedIn(status: boolean) {
    this._isSignedIn = status;
  }

  /**
   * タブ選択状態
   */
  private _selectedTabIndex = (() => {
    return Number(
      localStorage.getItem(LSKey.SelectedTabIndex) || 0
    ) as TabIndex;
  })();

  get selectedTabIndex() {
    return this._selectedTabIndex as TabIndex;
  }

  set selectedTabIndex(index: TabIndex) {
    this._selectedTabIndex = index;
    localStorage.setItem(LSKey.SelectedTabIndex, index.toString());
  }

  /**
   * 再生モード
   */
  private _playMode = (() => {
    return Number(localStorage.getItem(LSKey.PlayMode) || 0) as PlayMode;
  })();

  get playMode() {
    return this._playMode;
  }

  set playMode(mode: PlayMode) {
    this._playMode = mode;
    localStorage.setItem(LSKey.PlayMode, mode.toString());
  }

  /**
   * タイトルの表示モード
   */
  private _displayMode = (() => {
    return Number(localStorage.getItem(LSKey.DisplayMode) || 0) as DisplayMode;
  })();

  get displayMode() {
    return this._displayMode;
  }

  set displayMode(mode: DisplayMode) {
    this._displayMode = mode;
    localStorage.setItem(LSKey.DisplayMode, mode.toString());
  }

  /**
   * プレイリストの保存とロード
   */
  savePlayList(list: FileData[]): void {
    const jsonStr = JSON.stringify(list);
    localStorage.setItem(LSKey.PlayList, jsonStr);
  }

  loadPlayList(): FileData[] {
    const jsonStr = localStorage.getItem(LSKey.PlayList) || "[]";
    return JSON.parse(jsonStr);
  }

  /**
   * プレイしているファイルのID
   */
  private _playId = "";

  get playId() {
    return this._playId;
  }

  set playId(id: string) {
    this._playId = id;
  }

  /**
   * 最後にクリックしたリスト
   */
  private _lastClickedListType: TabIndex = TabIndex.Playlist;

  get lastClickListType() {
    return this._lastClickedListType;
  }

  set lastClickListType(idx: TabIndex) {
    this._lastClickedListType = idx;
  }
}

export const appState = Vue.observable(new AppState());
