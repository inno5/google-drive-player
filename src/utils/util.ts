import { DisplayMode, FileData } from "@/interface/interface";
import { audioService } from "@/services/audio-service";
import { appState } from "@/state/app-state";

export const isPC = (): boolean => {
  const ua = navigator.userAgent;
  if (
    ua.indexOf("iPhone") > -1 ||
    (ua.indexOf("Android") > -1 && ua.indexOf("Mobile") > -1)
  ) {
    // スマホ
    return false;
  } else if (ua.indexOf("iPad") > -1 || ua.indexOf("Android") > -1) {
    // タブレット
    return false;
  } else {
    // PC
    return true;
  }
};

export const isFolder = (file: FileData): boolean => {
  return file.mimeType === "application/vnd.google-apps.folder";
};

export const getDispText = (file: FileData): string => {
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
};
