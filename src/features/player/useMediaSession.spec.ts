import { mount } from "@vue/test-utils";
import { defineComponent, reactive, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useMediaSession,
  type MediaSessionPlayer,
  type NowPlayingMetadata,
} from "./useMediaSession";

type Handler = (details: MediaSessionActionDetails) => void;

function fakeSession() {
  const handlers = new Map<string, Handler | null>();
  return {
    handlers,
    session: {
      metadata: null as unknown,
      playbackState: "none",
      setActionHandler: vi.fn((action: string, handler: Handler | null) => {
        handlers.set(action, handler);
      }),
      setPositionState: vi.fn(),
    },
  };
}

function fakePlayer() {
  return reactive({
    status: "paused" as MediaSessionPlayer["status"],
    currentTime: 30,
    duration: 100,
    resume: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    seek: vi.fn(),
  });
}

function mountWith(
  player: MediaSessionPlayer,
  meta = ref<NowPlayingMetadata | null>(null),
) {
  const wrapper = mount(
    defineComponent({
      setup() {
        useMediaSession(player, () => meta.value);
        return () => null;
      },
    }),
  );
  return { wrapper, meta };
}

function call(
  handlers: Map<string, Handler | null>,
  action: string,
  details = {},
) {
  handlers.get(action)?.({ action, ...details } as MediaSessionActionDetails);
}

describe("useMediaSession", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "MediaMetadata",
      class {
        title: string;
        constructor(init: { title: string }) {
          this.title = init.title;
        }
      },
    );
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaSession");
    vi.unstubAllGlobals();
  });

  function install() {
    const fake = fakeSession();
    Object.defineProperty(navigator, "mediaSession", {
      value: fake.session,
      configurable: true,
    });
    return fake;
  }

  it("ロック画面・イヤホンの操作を player につなぐ", () => {
    const { handlers } = install();
    const player = fakePlayer();
    mountWith(player);

    call(handlers, "play");
    call(handlers, "pause");
    call(handlers, "nexttrack");
    call(handlers, "previoustrack");
    call(handlers, "seekto", { seekTime: 55 });
    call(handlers, "seekbackward", { seekOffset: 5 });
    call(handlers, "seekforward");

    expect(player.resume).toHaveBeenCalled();
    expect(player.pause).toHaveBeenCalled();
    expect(player.next).toHaveBeenCalled();
    expect(player.prev).toHaveBeenCalled();
    expect(player.seek).toHaveBeenNthCalledWith(1, 55);
    expect(player.seek).toHaveBeenNthCalledWith(2, 25);
    expect(player.seek).toHaveBeenNthCalledWith(3, 40);
  });

  it("曲情報・再生状態・位置を反映する", async () => {
    const fake = install();
    const player = fakePlayer();
    const { meta } = mountWith(player);
    expect(fake.session.metadata).toBeNull();

    meta.value = { title: "song" };
    player.status = "playing";
    player.currentTime = 31;
    await Promise.resolve();
    await Promise.resolve();

    expect((fake.session.metadata as { title: string }).title).toBe("song");
    expect(fake.session.playbackState).toBe("playing");
    expect(fake.session.setPositionState).toHaveBeenLastCalledWith({
      duration: 100,
      position: 31,
      playbackRate: 1,
    });
  });

  it("画面を離れたら、操作と曲情報を手放す", () => {
    const fake = install();
    const { wrapper } = mountWith(fakePlayer(), ref({ title: "song" }));
    wrapper.unmount();
    expect(fake.handlers.get("play")).toBeNull();
    expect(fake.handlers.get("nexttrack")).toBeNull();
    expect(fake.session.metadata).toBeNull();
    expect(fake.session.playbackState).toBe("none");
  });

  it("Media Session がない環境では何もしない", () => {
    expect(() => mountWith(fakePlayer())).not.toThrow();
  });
});
