import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = global.fetch;

async function loadLeader() {
  vi.resetModules();
  return import("./connectedLeader");
}

afterEach(() => {
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("connected leader provider chain", () => {
  it("uses Flash when its response is available", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "رد Flash" }] } }] }), { status: 200 }));
    const { getConnectedLeaderReply } = await loadLeader();
    await expect(getConnectedLeaderReply("أريد خطة للصورة")).resolves.toMatchObject({ source: "gemini-flash", reply: "رد Flash", usedFallback: false });
  });

  it("falls back to Flash-Lite when Flash fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response("temporary demand", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "رد Lite" }] } }] }), { status: 200 }));
    const { getConnectedLeaderReply } = await loadLeader();
    await expect(getConnectedLeaderReply("حسّن القالب")).resolves.toMatchObject({ source: "gemini-flash-lite", reply: "رد Lite", usedFallback: true });
  });

  it("returns the local leader safely when the online chain is unavailable", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const { getConnectedLeaderReply } = await loadLeader();
    const result = await getConnectedLeaderReply("أرفق شعاراً");
    expect(result.source).toBe("local-fallback");
    expect(result.usedFallback).toBe(true);
    expect(result.reply).toContain("القائد المحلي");
  });
});
