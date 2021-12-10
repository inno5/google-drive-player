import jsmediatags from "jsmediatags";
import { appService } from "./app-service";
import { AudioMeta, FileData } from "@/interface/interface";
import { isFolder } from "@/utils/util";

interface TagResponce {
  tags: {
    artist: string;
    title: string;
    album: string;
    track: string;
  };
}

class AudioService {
  private driveList: FileData[] = [];
  private playList: FileData[] = [];

  private readerQueue: FileData[] = [];
  private isReading = false;

  private readTag = (file: FileData) => {
    const promise = new Promise<TagResponce | null>((resolve) => {
      const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      jsmediatags.Config.setRequestHeaders([
        {
          key: "Authorization",
          value: `Bearer ${appService.getGoogleOAuthAccessToken()}`,
        },
      ]);

      jsmediatags.read(url, {
        onSuccess: (tag: TagResponce) => {
          console.log(tag);
          resolve(tag);
        },
        onError: () => {
          resolve(null);
        },
      });
    });

    return promise;
  };

  private async read() {
    const targetFile = this.readerQueue.shift();
    if (!targetFile) {
      return;
    }

    this.isReading = true;

    const tag = await this.readTag(targetFile);
    if (tag) {
      const meta: AudioMeta = [
        new Date(targetFile.modifiedTime).getTime(),
        tag.tags.artist || "",
        tag.tags.title || "",
        tag.tags.album || "",
        tag.tags.track || "",
      ];
      targetFile.meta = meta;
      appService.setAudioMeta(targetFile.id, meta);
      appService.saveAudioMetas();
    }

    this.isReading = false;
  }

  updateTags(files: FileData[]) {
    const audioFiles = files.filter((f) => !isFolder(f));
    this.readerQueue = this.readerQueue.concat(audioFiles);

    if (!this.isReading) {
      this.read();
    }
  }

  attachMetaToFiles(files: FileData[]) {
    files.forEach((f) => {
      const meta = appService.getAudioMeta(f.id);
      if (meta) {
        f.meta = meta;
      }
    });
  }
}

export const audioService = new AudioService();
