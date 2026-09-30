import { isFolder, type DriveApi, type DriveItem } from "@/features/drive";

/** 1 回のフォルダ追加で入れる曲数の上限 */
export const MAX_TRACKS = 500;
/** たどるフォルダの深さの上限（指定したフォルダの直下を 1 段目とする） */
export const MAX_DEPTH = 10;
/** 1 回の API 呼び出しにまとめる親フォルダの数 */
export const PARENTS_PER_REQUEST = 50;

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function byName(a: DriveItem, b: DriveItem): number {
  return collator.compare(a.name, b.name);
}

export interface CollectOptions {
  signal?: AbortSignal;
  /** 集めた曲数が増えるたびに呼ばれる */
  onProgress?: (count: number) => void;
  maxTracks?: number;
  maxDepth?: number;
}

export interface CollectResult {
  items: DriveItem[];
  /** 上限（曲数・深さ）で打ち切ったか */
  truncated: boolean;
}

interface Children {
  files: DriveItem[];
  folders: DriveItem[];
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("aborted", "AbortError");
  }
}

function chunk<T>(list: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

/**
 * フォルダの中の音声ファイルを、サブフォルダを含めてすべて集める。
 *
 * 並び順は「フォルダ順 → 名前順」: フォルダ直下のファイルを名前の自然順（2 → 10）で並べ、
 * そのあとにサブフォルダを名前の自然順で 1 つずつ、同じ規則で並べる。
 * 途中でエラーになったら何も返さない（例外を投げる）。
 */
export async function collectFolder(
  api: DriveApi,
  folder: Pick<DriveItem, "id">,
  options: CollectOptions = {},
): Promise<CollectResult> {
  const {
    signal,
    onProgress,
    maxTracks = MAX_TRACKS,
    maxDepth = MAX_DEPTH,
  } = options;
  const items: DriveItem[] = [];
  const seen = new Set<string>();
  let truncated = false;

  /** 複数フォルダの直下を、全ページ分まとめて取得して親ごとに分ける */
  async function fetchChildren(
    parentIds: readonly string[],
  ): Promise<Map<string, Children>> {
    const parents = new Set(parentIds);
    const byParent = new Map<string, Children>();
    let pageToken: string | null = null;
    do {
      throwIfAborted(signal);
      const page = await api.listChildren(parentIds, { pageToken, signal });
      for (const item of page.items) {
        const parentId = item.parents.find((p) => parents.has(p));
        if (parentId === undefined) {
          continue;
        }
        let children = byParent.get(parentId);
        if (!children) {
          children = { files: [], folders: [] };
          byParent.set(parentId, children);
        }
        (isFolder(item) ? children.folders : children.files).push(item);
      }
      pageToken = page.nextPageToken;
    } while (pageToken !== null);
    return byParent;
  }

  /**
   * folderIds（兄弟のフォルダ）の中身を、この順に並べて items に足す。
   * depth は、これらの直下の階層（指定フォルダの直下が 1）。
   * 上限に達したら false を返して、それ以降は集めない。
   */
  async function walk(
    folderIds: readonly string[],
    depth: number,
  ): Promise<boolean> {
    const childrenByParent = await fetchChildren(folderIds);
    for (const id of folderIds) {
      const children = childrenByParent.get(id);
      if (!children) {
        continue;
      }
      for (const file of [...children.files].sort(byName)) {
        if (seen.has(file.id)) {
          continue;
        }
        if (items.length >= maxTracks) {
          truncated = true;
          return false;
        }
        seen.add(file.id);
        items.push(file);
        onProgress?.(items.length);
      }
      if (children.folders.length === 0) {
        continue;
      }
      if (depth >= maxDepth) {
        truncated = true;
        continue;
      }
      const subfolderIds = [...children.folders].sort(byName).map((f) => f.id);
      for (const ids of chunk(subfolderIds, PARENTS_PER_REQUEST)) {
        if (!(await walk(ids, depth + 1))) {
          return false;
        }
      }
    }
    return true;
  }

  await walk([folder.id], 1);
  return { items, truncated };
}
