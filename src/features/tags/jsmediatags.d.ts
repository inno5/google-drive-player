/**
 * jsmediatags（個人フォーク）のうち、このアプリが使う部分だけの型。
 * git の依存はビルドされず main（build2/）がないため、ブラウザ用にビルド済みの
 * dist/jsmediatags.js を直接指定して import する（Vite でもテストでも解決できる）。
 */
declare module "jsmediatags/dist/jsmediatags.js" {
  export interface TagError {
    /** タグがないときは "tagFormat"。通信エラーなどは、それ以外 */
    type: string;
    info: string;
  }

  export interface TagResult {
    tags: {
      artist?: unknown;
      title?: unknown;
      album?: unknown;
      track?: unknown;
    };
  }

  export interface ReadCallbacks {
    onSuccess(tag: TagResult): void;
    onError(error: TagError): void;
  }

  export interface RequestHeader {
    key: string;
    value: string;
  }

  interface JsMediaTags {
    read(location: string, callbacks: ReadCallbacks): void;
    Config: {
      /** 以降の読み取りのリクエストに付けるヘッダー（全体の設定） */
      setRequestHeaders(headers: RequestHeader[]): void;
    };
  }

  const jsmediatags: JsMediaTags;
  export default jsmediatags;
}
