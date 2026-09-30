import { AuthExpiredError } from "@/features/auth";
import { childrenQuery, folderQuery, searchQuery } from "./drive-query";
import type { DriveItem } from "./drive-types";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const FIELDS =
  "nextPageToken, files(id, name, size, mimeType, parents, modifiedTime)";
const LIST_PAGE_SIZE = 100;
const CHILDREN_PAGE_SIZE = 1000;
/** 一覧・検索の並び順: フォルダが先、その中は名前順 */
const LIST_ORDER = "folder asc, name asc";

/** DriveApi が認証に求めるもの。auth store がこの形を満たす */
export interface DriveAuth {
  /** 有効なアクセストークン（期限が近ければ更新済み） */
  getValidToken(): Promise<string>;
  /** アクセストークンを強制的に取り直す。できなければ AuthExpiredError */
  refreshToken(): Promise<string>;
  /** トークンが使えないと分かったときの後始末（signedOut にする） */
  expire(): void;
}

export interface ListOptions {
  pageToken?: string | null;
  signal?: AbortSignal;
}

export interface ListPage {
  items: DriveItem[];
  /** 次のページがなければ null */
  nextPageToken: string | null;
}

export interface DriveApi {
  listFolder(folderId: string, options?: ListOptions): Promise<ListPage>;
  search(word: string, options?: ListOptions): Promise<ListPage>;
  /** 複数のフォルダの直下をまとめて取得する（プレイリストへのフォルダ追加用） */
  listChildren(
    parentIds: readonly string[],
    options?: ListOptions,
  ): Promise<ListPage>;
}

export class DriveApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DriveApiError";
    this.status = status;
  }
}

interface RawFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

interface RawList {
  files?: RawFile[];
  nextPageToken?: string;
}

function toItem(raw: RawFile): DriveItem {
  const size = raw.size === undefined ? null : Number(raw.size);
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    size: size !== null && Number.isFinite(size) ? size : null,
    modifiedTime: raw.modifiedTime ?? "",
    parents: raw.parents ?? [],
  };
}

export function createDriveApi(
  auth: DriveAuth,
  fetchFn: typeof fetch = (input, init) => fetch(input, init),
): DriveApi {
  function send(url: string, token: string, signal?: AbortSignal) {
    return fetchFn(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
  }

  /** 401 のときだけ、トークンを取り直して 1 回だけ再試行する */
  async function request(url: string, signal?: AbortSignal): Promise<RawList> {
    let response = await send(url, await auth.getValidToken(), signal);
    if (response.status === 401) {
      response = await send(url, await auth.refreshToken(), signal);
      if (response.status === 401) {
        auth.expire();
        throw new AuthExpiredError();
      }
    }
    if (!response.ok) {
      throw new DriveApiError(
        response.status,
        `Drive API がエラーを返しました (${response.status})`,
      );
    }
    return (await response.json()) as RawList;
  }

  async function list(
    query: string,
    pageSize: number,
    orderBy: string | null,
    options: ListOptions = {},
  ): Promise<ListPage> {
    const params = new URLSearchParams({
      q: query,
      pageSize: String(pageSize),
      fields: FIELDS,
    });
    if (orderBy) {
      params.set("orderBy", orderBy);
    }
    if (options.pageToken) {
      params.set("pageToken", options.pageToken);
    }
    const body = await request(
      `${FILES_URL}?${params.toString()}`,
      options.signal,
    );
    return {
      items: (body.files ?? []).map(toItem),
      nextPageToken: body.nextPageToken ?? null,
    };
  }

  return {
    listFolder: (folderId, options) =>
      list(folderQuery(folderId), LIST_PAGE_SIZE, LIST_ORDER, options),
    search: (word, options) =>
      list(searchQuery(word), LIST_PAGE_SIZE, LIST_ORDER, options),
    listChildren: (parentIds, options) =>
      list(childrenQuery(parentIds), CHILDREN_PAGE_SIZE, null, options),
  };
}
