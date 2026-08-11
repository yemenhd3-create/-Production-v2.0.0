# Production Deployment

## 1. Requirements
- Node.js 20+
- HTTPS in front of the application for real deployment

## 2. Environment
Create `.env` (never commit it):

```env
NODE_ENV=production
PORT=4173
DEVELOPER_SECRET=<random secret at least 32 characters>
```

The server reads `.env` automatically when process environment variables are not already set.

## 3. Start

```bash
npm install
npm test
npm run check
npm start
```

For a public deployment, place a reverse proxy such as nginx/Caddy/Cloudflare in front of Node and use HTTPS.

## 4. Persistent files

Back up these server-side files:
- `server/tokens.json`
- `server/keys/activation.json`

Never expose `server/keys/` or `.env` through the web server.

## 5. First user activation
Developer generates a user code from the developer section. The user enters it while online. The server returns a signed token. The client verifies the signature and can then continue offline until expiry.

## 6. Important open-source limitation
The client is open source and executes on the user's device. It cannot provide absolute anti-tamper DRM. The signed token prevents the naive bypass where any arbitrary offline code is accepted, while preserving the offline-first requirement.
