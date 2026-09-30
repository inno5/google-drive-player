import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadCallbacks } from "jsmediatags/dist/jsmediatags.js";
import { fixLatin1Mojibake, readTags } from "./tag-reader";

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  setRequestHeaders: vi.fn(),
}));

vi.mock("jsmediatags/dist/jsmediatags.js", () => ({
  default: {
    read: mocks.read,
    Config: { setRequestHeaders: mocks.setRequestHeaders },
  },
}));

/** ISO-8859-1 として読んだ文字列（1 バイト = 1 文字） */
function latin1(bytes: number[]): string {
  return String.fromCharCode(...bytes);
}

/** サンプルの mp3 のアーティスト（Shift_JIS のバイト列）。「矢井田　瞳」 */
const SJIS_ARTIST = latin1([
  0x96, 0xee, 0x88, 0xe4, 0x93, 0x63, 0x81, 0x40, 0x93, 0xb5,
]);

describe("fixLatin1Mojibake", () => {
  it("Shift_JIS のバイト列を ISO-8859-1 として読んだ文字列を直す", () => {
    expect(fixLatin1Mojibake(SJIS_ARTIST)).toBe("矢井田　瞳");
  });

  it("GBK のバイト列（ID3v1 のアーティスト欄）も直す", () => {
    // 2 つ目のサンプルの mp3。RIFF（RMP3）に包まれ、ID3v1 のアーティストが GBK
    const gbk = latin1([0xca, 0xb8, 0xbe, 0xae, 0xcc, 0xef, 0xcd, 0xab]);
    expect(fixLatin1Mojibake(gbk)).toBe("矢井田瞳");
  });

  it("Shift_JIS としても GBK としても読めるバイト列は Shift_JIS を採る", () => {
    // 0x89 0xB9 は、Shift_JIS では「音」、GBK では別の字
    expect(fixLatin1Mojibake(latin1([0x89, 0xb9]))).toBe("音");
  });

  it("ASCII だけの文字列はそのまま", () => {
    expect(fixLatin1Mojibake("Look Back Again")).toBe("Look Back Again");
    expect(fixLatin1Mojibake("")).toBe("");
  });

  it("正しく読めている日本語（U+00FF を超える文字を含む）はそのまま", () => {
    expect(fixLatin1Mojibake("矢井田　瞳")).toBe("矢井田　瞳");
    expect(fixLatin1Mojibake("Ⅲ 夜明け")).toBe("Ⅲ 夜明け");
  });

  it("Shift_JIS として読めない Latin-1 の文字列はそのまま", () => {
    expect(fixLatin1Mojibake("Café")).toBe("Café");
    expect(fixLatin1Mojibake("Beyoncé - Halo")).toBe("Beyoncé - Halo");
  });

  it("半角カナだけになる場合は、元の文字列のまま", () => {
    expect(fixLatin1Mojibake("¡")).toBe("¡");
  });

  it("ASCII と Shift_JIS が混ざっていても直す", () => {
    // "Go " のあとに「音」(0x89 0xB9)
    expect(fixLatin1Mojibake(`Go ${latin1([0x89, 0xb9])}`)).toBe("Go 音");
  });
});

describe("readTags", () => {
  beforeEach(() => {
    mocks.read.mockReset();
    mocks.setRequestHeaders.mockReset();
  });

  function respondWith(handler: (callbacks: ReadCallbacks) => void) {
    mocks.read.mockImplementation((_url: string, callbacks: ReadCallbacks) => {
      handler(callbacks);
    });
  }

  it("タグを読んで返す。文字化けは直し、トラックはそのまま", async () => {
    respondWith((callbacks) => {
      callbacks.onSuccess({
        tags: {
          artist: SJIS_ARTIST,
          title: "Look Back Again",
          album: "Single",
          track: "3/12",
        },
      });
    });
    expect(await readTags("id1", "tok")).toEqual({
      status: "ok",
      tags: {
        artist: "矢井田　瞳",
        title: "Look Back Again",
        album: "Single",
        track: "3/12",
      },
    });
  });

  it("ない項目は空文字にする。数値のトラックは文字列にする", async () => {
    respondWith((callbacks) => {
      callbacks.onSuccess({ tags: { title: " T ", track: 5 } });
    });
    expect(await readTags("id1", "tok")).toEqual({
      status: "ok",
      tags: { artist: "", title: "T", album: "", track: "5" },
    });
  });

  it("Authorization ヘッダーを設定し、ファイルの URL を読む", async () => {
    respondWith((callbacks) => {
      callbacks.onSuccess({ tags: {} });
    });
    await readTags("a/b", "tok");
    expect(mocks.setRequestHeaders).toHaveBeenCalledWith([
      { key: "Authorization", value: "Bearer tok" },
    ]);
    expect(mocks.read.mock.calls[0]?.[0]).toBe(
      "https://www.googleapis.com/drive/v3/files/a%2Fb?alt=media",
    );
  });

  it("タグがないファイルは none", async () => {
    respondWith((callbacks) => {
      callbacks.onError({
        type: "tagFormat",
        info: "No suitable tag reader found",
      });
    });
    expect(await readTags("id1", "tok")).toEqual({ status: "none" });
  });

  it("通信などのエラーは failed", async () => {
    respondWith((callbacks) => {
      callbacks.onError({ type: "xhr", info: "Forbidden" });
    });
    expect(await readTags("id1", "tok")).toEqual({ status: "failed" });
  });

  it("jsmediatags が例外を投げたときも failed", async () => {
    mocks.read.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(await readTags("id1", "tok")).toEqual({ status: "failed" });
  });
});
