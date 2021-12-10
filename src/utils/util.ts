import { FileData } from "@/interface/interface";

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
