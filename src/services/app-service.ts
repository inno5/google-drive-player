import {
  PlayMode,
  AudioMeta,
  TabIndex,
  FileData,
  DisplayMode,
} from "@/interface/interface";

/**
 * アプリ全般のデータを管理するサービス
 */
enum LSKey {
  AppSettings = "ls-key-app-setting",
  PlayMode = "ls-key-play-mode",
  DIsplayMode = "ls-key-display-mode",
  SelectedTabIndex = "ls-key-selected-tab-index",
  AudioMetas = "ls-key-audio-metas",
  PlayList = "ls-key-play-list",
}

class AppService {
  private googleOAuthAccessToken = "";
  // private audioMetas: { [key: string]: AudioMeta } = {};

  /**
   * OAuth info
   */
  getGoogleOAuthAccessToken() {
    return this.googleOAuthAccessToken;
  }

  setGoogleOAuthAccessToken(code: string) {
    this.googleOAuthAccessToken = code;
  }

  /**
   * play mode
   */
  getPlayMode() {
    return Number(localStorage.getItem(LSKey.PlayMode) || 0) as PlayMode;
  }

  setPlayMode(mode: PlayMode) {
    localStorage.setItem(LSKey.PlayMode, mode.toString());
  }

  /**
   * display mode
   */
  getDisplayMode() {
    return Number(localStorage.getItem(LSKey.DIsplayMode) || 0) as DisplayMode;
  }

  setDisplayMode(mode: DisplayMode) {
    localStorage.setItem(LSKey.DIsplayMode, mode.toString());
  }

  /**
   * selected tab index
   */
  getSelectedTabIndex() {
    return Number(
      localStorage.getItem(LSKey.SelectedTabIndex) || 0
    ) as TabIndex;
  }

  setSelectedTabIndex(index: TabIndex) {
    localStorage.setItem(LSKey.SelectedTabIndex, index.toString());
  }

  /**
   * play list
   */
  savePlayList(list: FileData[]): void {
    const jsonStr = JSON.stringify(list);
    localStorage.setItem(LSKey.PlayList, jsonStr);
  }

  getPlayList(): FileData[] {
    const jsonStr = localStorage.getItem(LSKey.PlayList) || "[]";
    return JSON.parse(jsonStr);
  }

  /**
   * audioMeta
   */
  getAudioMeta(id: string) {
    const str = localStorage.getItem(`meta-${id}`);
    if (str) {
      return JSON.parse(str);
    } else {
      return null;
    }
  }

  setAudioMeta(id: string, meta: AudioMeta) {
    localStorage.setItem(`meta-${id}`, JSON.stringify(meta));
  }

  clearAudioMeta() {
    for (let i = 0, len = localStorage.length; i < len; i++) {
      const key = localStorage.key(i);
      if (key && key.indexOf("meta-") == 0) {
        localStorage.removeItem(key);
        len--;
      }
    }
  }

  clearAllData() {
    localStorage.clear();
  }
}

export const appService = new AppService();
