import { describe, expect, it, vi } from "vitest";
import { loadMedia } from "./media-loader";

describe("loadMedia", () => {
  it("取得した Blob から URL を作る。revoke は 1 度だけ解放する", async () => {
    const blob = new Blob(["x"], { type: "audio/mpeg" });
    const downloadFile = vi.fn(() => Promise.resolve(blob));
    const urls = { create: vi.fn(() => "blob:1"), revoke: vi.fn() };
    const controller = new AbortController();
    const onProgress = vi.fn();

    const media = await loadMedia(
      { downloadFile },
      { id: "f1", mimeType: "audio/mpeg" },
      { signal: controller.signal, onProgress },
      urls,
    );

    expect(downloadFile).toHaveBeenCalledWith("f1", {
      signal: controller.signal,
      onProgress,
      mimeType: "audio/mpeg",
    });
    expect(urls.create).toHaveBeenCalledWith(blob);
    expect(media.url).toBe("blob:1");

    media.revoke();
    media.revoke();
    expect(urls.revoke).toHaveBeenCalledTimes(1);
    expect(urls.revoke).toHaveBeenCalledWith("blob:1");
  });

  it("取得に失敗したら URL は作らない", async () => {
    const urls = { create: vi.fn(() => "blob:1"), revoke: vi.fn() };
    await expect(
      loadMedia(
        { downloadFile: () => Promise.reject(new Error("boom")) },
        { id: "f1", mimeType: "audio/mpeg" },
        {},
        urls,
      ),
    ).rejects.toThrow("boom");
    expect(urls.create).not.toHaveBeenCalled();
  });
});
