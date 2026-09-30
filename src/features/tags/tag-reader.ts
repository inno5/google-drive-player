import { EMPTY_TAGS, type RawTags, type ReadOutcome } from "./tag-types";

const FILES_URL = "https://www.googleapis.com/drive/v3/files";

/**
 * ISO-8859-1 として読まれたときに、直す候補にする文字コード（この順に試す）。
 * ID3 の文字コードの指定が ISO-8859-1 のまま、中身が別の文字コードのバイト列になっているタグがある。
 * Shift_JIS（日本のタグ付けソフト）と GBK（中国語圏のソフト。日本のアーティストも GBK で付けられることがある）。
 * どちらとしても読めるバイト列は、先の Shift_JIS を採る。
 */
const FALLBACK_ENCODINGS = ["shift_jis", "gbk"] as const;

/** 日本語・中国語の文字を含むか（半角カナと ASCII だけの結果は、誤変換の可能性が高いので除く） */
function hasWideText(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code > 0x7f && !(code >= 0xff61 && code <= 0xff9f)) {
      return true;
    }
  }
  return false;
}

/**
 * ISO-8859-1 として読んだ文字列を、バイト列に戻して Shift_JIS・GBK として読み直す。
 * 直せないもの、直す必要がないものは、そのまま返す。
 */
export function fixLatin1Mojibake(text: string): string {
  const bytes = new Uint8Array(text.length);
  let hasHigh = false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0xff) {
      return text;
    }
    if (code >= 0x80) {
      hasHigh = true;
    }
    bytes[i] = code;
  }
  if (!hasHigh) {
    return text;
  }

  for (const encoding of FALLBACK_ENCODINGS) {
    try {
      const decoded = new TextDecoder(encoding, { fatal: true }).decode(bytes);
      if (hasWideText(decoded)) {
        return decoded;
      }
    } catch {
      // 別の文字コードを試す
    }
  }
  return text;
}

function toText(value: unknown): string {
  if (typeof value === "string") {
    return fixLatin1Mojibake(value).trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

/** トラック番号は数字などなので、文字コードの補正はしない */
function toTrack(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

function normalize(raw: {
  artist?: unknown;
  title?: unknown;
  album?: unknown;
  track?: unknown;
}): RawTags {
  return {
    ...EMPTY_TAGS,
    artist: toText(raw.artist),
    title: toText(raw.title),
    album: toText(raw.album),
    track: toTrack(raw.track),
  };
}

/**
 * Drive のファイルのタグを読む。
 * jsmediatags が Range リクエストで、タグのある部分だけを取得する。
 * ヘッダーの設定は jsmediatags 全体のものなので、読み取りの直前に毎回設定する。
 */
export async function readTags(
  fileId: string,
  token: string,
): Promise<ReadOutcome> {
  let jsmediatags: (typeof import("jsmediatags/dist/jsmediatags.js"))["default"];
  try {
    jsmediatags = (await import("jsmediatags/dist/jsmediatags.js")).default;
  } catch {
    return { status: "failed" };
  }

  return new Promise<ReadOutcome>((resolve) => {
    try {
      jsmediatags.Config.setRequestHeaders([
        { key: "Authorization", value: `Bearer ${token}` },
      ]);
      jsmediatags.read(`${FILES_URL}/${encodeURIComponent(fileId)}?alt=media`, {
        onSuccess: (result) => {
          resolve({ status: "ok", tags: normalize(result.tags) });
        },
        onError: (error) => {
          resolve({
            status: error.type === "tagFormat" ? "none" : "failed",
          });
        },
      });
    } catch {
      resolve({ status: "failed" });
    }
  });
}
