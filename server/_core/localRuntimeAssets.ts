import type { Express } from "express";
import { Readable } from "node:stream";

const LOCAL_RUNTIME_ASSETS = {
  "u2netp.onnx": {
    url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663879407485/LuAuubtVdhStjFna.onnx",
    contentType: "application/octet-stream",
  },
  "ort-wasm-simd-threaded.wasm": {
    url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663879407485/NlSFcAcgzsWpdAMY.wasm",
    contentType: "application/wasm",
  },
  "ort-wasm-simd-threaded.mjs": {
    url: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663879407485/XGHNVXuHbkcanxUW.mjs",
    contentType: "text/javascript; charset=utf-8",
  },
} as const;

export type LocalRuntimeAssetName = keyof typeof LOCAL_RUNTIME_ASSETS;

export function getLocalRuntimeAsset(name: string) {
  return Object.prototype.hasOwnProperty.call(LOCAL_RUNTIME_ASSETS, name)
    ? LOCAL_RUNTIME_ASSETS[name as LocalRuntimeAssetName]
    : null;
}

/**
 * يمرر ملفات النموذج الثابتة فقط عبر نفس أصل التطبيق. لا يقبل روابط أو مسارات يختارها المستخدم،
 * ولذلك لا يتحول إلى proxy عام ولا يرسل أي صورة أو بيانات تاجر إلى الخارج.
 */
export function registerLocalRuntimeAssets(app: Express) {
  app.get("/local-runtime-assets/:asset", async (req, res) => {
    const asset = getLocalRuntimeAsset(req.params.asset);
    if (!asset) {
      res.status(404).send("Unknown local runtime asset");
      return;
    }

    try {
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok || !response.body) {
        res.status(502).send("Local runtime asset unavailable");
        return;
      }

      res.set({
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      Readable.fromWeb(response.body as never).on("error", () => res.destroy()).pipe(res);
    } catch (error) {
      console.error("[LocalRuntimeAssets] failed:", error);
      res.status(502).send("Local runtime asset unavailable");
    }
  });
}
