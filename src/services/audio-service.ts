import jsmediatags from "jsmediatags";
import { appService } from "./app-service";
import { AudioMeta, DEFAULT_PARENT, FileData } from "@/interface/interface";
import { isFolder } from "@/utils/util";
import { gapi } from "./gapi-service";
import { StateChanger } from "vue-infinite-loading";

interface TagResponce {
  tags: {
    artist: string;
    title: string;
    album: string;
    track: string;
  };
}

const MAX_TAG_READER_COUNT = 10;

class AudioService {
  /**
   * google drive
   */
  private _driveList: FileData[] = [];
  get driveList() {
    return this._driveList;
  }
  private nextPageToken = "";
  private lastListRequest: Promise<void> | null = null;

  loadDriveList(searchWord = "", parentId = "", stateChanger: StateChanger) {
    let query = `(mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'audio/') and trashed = false`;
    if (searchWord) {
      query += ` and name contains '${searchWord}'`;
    } else {
      query += ` and '${parentId || DEFAULT_PARENT}' in parents`;
    }

    const req: Promise<any> = gapi.client.drive.files
      .list({
        pageSize: 100,
        // https://developers.google.com/drive/api/v3/reference/files
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

          response.result.files.forEach((f: FileData) => {
            this._driveList.push(f);
          });

          // タグ読み込み
          this.updateTags();

          stateChanger.loaded();

          if (response.result.nextPageToken) {
            this.nextPageToken = response.result.nextPageToken;
          } else {
            this.nextPageToken = "";
            stateChanger.complete();
          }
        },
        (err: Error) => {
          console.log(err);
        }
      );

    this.lastListRequest = req;
    return req;
  }

  clearDriveList() {
    this._driveList.splice(0, this._driveList.length);
    this.nextPageToken = "";
  }

  /**
   * local playlist
   */
  private _playList: FileData[] = appService.getPlayList();

  get playList() {
    return this._playList;
  }

  async addToPlayList(file: FileData): Promise<void> {
    let files: FileData[];
    if (isFolder(file)) {
      files = await this.loadFilesIncludeSubFolder([file.id]).catch(() => []);
    } else {
      files = [file];
    }

    files.forEach((f) => {
      const currentFile = this._playList.find((plf) => plf.id === f.id);
      if (!currentFile) {
        this._playList.push(f);
      } else {
        // idが同じファイルがある場合はid以外の情報を更新する
        this.updateFileData(currentFile, f);
      }
    });

    // タグ読み込み
    this.updateTags();
    appService.savePlayList(this._playList);
  }

  private async loadFilesIncludeSubFolder(folderIds: string[] | null = null) {
    const result = await this._loadFilesIncludeSubFolder(folderIds);
    result.sort((a, b) => {
      if (a.parents[0] != b.parents[0]) {
        return 1;
      }

      return parseInt(a.name) - parseInt(b.name);
    });
    return result;
  }

  private async _loadFilesIncludeSubFolder(
    folderIds: string[] | null = null
  ): Promise<FileData[]> {
    const promise = new Promise<FileData[]>((resolve) => {
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
            const fIds = (response.result.files as FileData[]).reduce(
              (acc: string[], f: FileData) => {
                if (isFolder(f)) {
                  acc.push(f.id);
                }
                return acc;
              },
              []
            );

            let filesInFolder: FileData[] = [];
            if (fIds.length > 0) {
              while (fIds.length > 0) {
                const result = await this._loadFilesIncludeSubFolder(
                  fIds.splice(0, 50)
                ).catch(() => []);
                filesInFolder = filesInFolder.concat(result);
              }
            }
            const filesInCurrent = (response.result.files as FileData[]).filter(
              (f) => !isFolder(f)
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

  removeFromPlayList(file: FileData): void {
    const idx = this._playList.findIndex((f) => f.id === file.id);
    if (idx >= 0) {
      this._playList.splice(idx, 1);
      appService.savePlayList(this._playList);
    }
  }

  clearPlayList(): void {
    this._playList.splice(0, this._playList.length);
    appService.savePlayList(this._playList);
  }

  /**
   * tag
   */
  private readerQueue: FileData[] = [];
  private tagReaderCount = 0;

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
          resolve(tag);
        },
        onError: () => {
          resolve(null);
        },
      });
    });

    return promise;
  };

  private async read(readerName = "") {
    const targetFile = this.readerQueue.shift();
    if (!targetFile) {
      this.tagReaderCount--;
      return;
    }

    const tag = await this.readTag(targetFile).catch(() => null);
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
      this._playList.splice(0, 0);
    }

    this.read(readerName);
  }

  updateTags() {
    const files = this._playList;
    const audioFiles = files.filter((f) => {
      // フォルダは除外
      if (isFolder(f)) {
        return false;
      }

      const storageValue = localStorage.getItem(`meta-${f.id}`);
      if (storageValue) {
        // 更新日が変わってないものは除外
        const storageValueAry: AudioMeta = JSON.parse(storageValue);
        if (storageValueAry[0] == new Date(f.modifiedTime).getTime()) {
          return false;
        }
      }

      return true;
    });

    audioFiles.forEach((f) => {
      const idx = this.readerQueue.findIndex((rq) => rq.id == f.id);
      if (idx == -1) {
        this.readerQueue.push(f);
      }
    });

    if (this.readerQueue.length > 0) {
      for (let i = this.tagReaderCount; i < MAX_TAG_READER_COUNT; i++) {
        this.read(`タグリーダー${this.tagReaderCount}号機`);
        this.tagReaderCount++;
      }
    }
  }

  updateFileData(currentFile: FileData, newFile: FileData) {
    currentFile.name = newFile.name;
    currentFile.modifiedTime = newFile.modifiedTime;
    currentFile.size = newFile.size;
    currentFile.parents = newFile.parents;
    currentFile.webContentLink = newFile.webContentLink;
    currentFile.mimeType = newFile.mimeType;
  }
}

export const audioService = new AudioService();
