import { PlayMode, AudioMeta, TabIndex } from "@/interface/interface";

/**
 * アプリ全般のデータを管理するサービス
 */
enum LSKey {
  AppSettings = "ls-key-app-setting",
  PlayMode = "ls-key-play-mode",
  SelectedTabIndex = "ls-key-selected-tab-index",
  AudioMetas = "ls-key-audio-metas",
}

class AppService {
  private googleOAuthAccessToken = "";
  private audioMetas: { [key: string]: AudioMeta } = {};

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
   * audioMeta
   */
  loadAudioMetas() {
    const str = localStorage.getItem(LSKey.AudioMetas) || "{}";
    this.audioMetas = JSON.parse(str);
  }

  saveAudioMetas() {
    localStorage.setItem(LSKey.AudioMetas, JSON.stringify(this.audioMetas));
  }

  getAudioMeta(key: string) {
    return this.audioMetas[key] || null;
  }

  setAudioMeta(key: string, meta: AudioMeta) {
    return (this.audioMetas[key] = meta);
  }

  deleteAudioMeta(key: string) {
    delete this.audioMetas[key];
  }
}

export const appService = new AppService();
