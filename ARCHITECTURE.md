# Production Architecture v2

## Local core
Image upload, local background processing, deterministic template rendering, Arabic text, center identity, PNG export and saved settings work without AI and without Internet.

## Activation
The first activation requires Internet. The server verifies a developer-issued code and signs a short-lived activation payload using Ed25519. The browser stores the signed token and the public key, then verifies the signature locally with Web Crypto. After first activation, the local core continues offline until expiry. There is no arbitrary offline-code bypass.

A determined user can modify an open-source client, so this is anti-bypass for normal use, not absolute DRM.

## AI
Multiple providers and keys are stored locally. The user selects an active provider. If it fails, the client tries other configured providers. Text generation uses an OpenAI-compatible chat endpoint. Virtual Try-On is intentionally separated and requires an actual image-capable provider.

## Developer secret
Only the server sees `DEVELOPER_SECRET`. Production refuses to start when it is missing or shorter than 32 characters.

## API key storage
Keys are encrypted at rest with Web Crypto AES-GCM using a locally derived key. This improves casual local storage exposure; it cannot protect a key from a fully compromised browser/device.
