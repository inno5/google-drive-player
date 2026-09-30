/**
 * 起動ごとの状態を localStorage に記録する（iOS ホーム画面アプリでの永続化確認用）
 * ヘルプボタンのダイアログに表示する
 */
const LS_KEY = "ls-key-debug-boot-log";
const PLAY_LIST_KEY = "ls-key-play-list";
const MAX_RECORDS = 10;

interface BootRecord {
  time: string; // 起動時刻
  standalone: boolean; // ホーム画面アプリとして起動したか
  keys: number; // 起動時点の localStorage のキー数
  playList: number; // 起動時点のプレイリスト曲数
  signedInAtInit: boolean | null; // 認証初期化直後の isSignedIn
  signedInAfter5s: boolean | null; // 初期化 5 秒後の isSignedIn
  tokenRestored: boolean | null; // 保存済みトークンでサインイン状態にしたか
}

const isStandalone = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (navigator as any).standalone === true;
  const displayStandalone =
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayStandalone;
};

const load = (): BootRecord[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch (e) {
    return [];
  }
};

const save = (records: BootRecord[]): void => {
  localStorage.setItem(LS_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
};

const updateLatest = (patch: Partial<BootRecord>): void => {
  const records = load();
  if (records.length === 0) {
    return;
  }
  Object.assign(records[records.length - 1], patch);
  save(records);
};

const countPlayList = (): number => {
  try {
    return JSON.parse(localStorage.getItem(PLAY_LIST_KEY) || "[]").length;
  } catch (e) {
    return -1;
  }
};

export const debugLog = {
  /**
   * 起動直後（他の処理が localStorage に触る前）に呼ぶ
   */
  recordBoot(): void {
    const records = load();
    records.push({
      time: new Date().toLocaleString(),
      standalone: isStandalone(),
      keys: localStorage.length,
      playList: countPlayList(),
      signedInAtInit: null,
      signedInAfter5s: null,
      tokenRestored: null,
    });
    save(records);
  },

  setSignedInAtInit(isSignedIn: boolean): void {
    updateLatest({ signedInAtInit: isSignedIn });
  },

  setTokenRestored(restored: boolean): void {
    updateLatest({ tokenRestored: restored });
  },

  setSignedInAfter5s(isSignedIn: boolean): void {
    updateLatest({ signedInAfter5s: isSignedIn });
  },

  format(): string {
    const mark = (v: boolean | null) => (v === null ? "-" : v ? "○" : "×");
    const lines = load()
      .slice()
      .reverse()
      .map(
        (r) =>
          `${r.time} ${r.standalone ? "[HOME]" : "[WEB]"} keys:${r.keys} list:${
            r.playList
          } auth:${mark(r.signedInAtInit)}→${mark(
            r.signedInAfter5s
          )} token:${mark(r.tokenRestored)}`
      );
    return ["起動ログ（新しい順）", ...lines].join("\n");
  },
};
