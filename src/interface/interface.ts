export enum PlayMode {
  Default = 0,
  Repeat = 1,
  Shuffle = 2,
}

export interface FileData {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: number;
  webContentLink?: string;
  parents: string[];
  meta?: AudioMeta;
}

export interface AudioMeta {
  0: number; // modifiedTime to unix time ms
  1: string; // tag-artist
  2: string; // tag-title
  3: string; // tag-album
  4: string; // tag-track
}

export enum TabIndex {
  Both = 0,
  PlaDriveylist = 1,
  Playlist = 2,
}
