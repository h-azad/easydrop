# Deployment

EasyDrop has two deployable parts:

- `apps/web`: Next.js UI. Deploy this to Vercel or Netlify.
- `apps/signaling-server`: Fastify + Socket.IO signaling server. Deploy this as a long-running Node process, for example with Docker on a VPS, Railway, Render, Fly.io, or similar.

Vercel and Netlify should use the `main` branch for production deployments.

## Docker

Run the full stack locally:

```bash
npm run docker:up
```

Services:

- Web: `http://localhost:3000`
- Signaling: `http://localhost:4000`
- Redis: `localhost:6379`

Stop the stack:

```bash
npm run docker:down
```

For LAN/mobile testing, do not use `localhost` in `NEXT_PUBLIC_SIGNALING_URL`; use the host IP or domain that other devices can reach, for example:

```bash
NEXT_PUBLIC_SIGNALING_URL=http://192.168.1.10:4000 docker compose up --build
```

If you change the URL, also update `CLIENT_ORIGIN` for the signaling server to match the web origin.

## Vercel Web Deployment

Deploy only `apps/web` to Vercel.

Recommended Vercel project settings:

- Git branch: `main`
- Root Directory: `apps/web`
- Framework Preset: Next.js
- Install Command: read from `apps/web/vercel.json`
- Build Command: read from `apps/web/vercel.json`
- Output Directory: `.next`

Environment variables:

```text
NEXT_PUBLIC_SIGNALING_URL=https://your-signaling-server.example.com
```

Set this for Production, Preview, and Development if you use Vercel previews.

## Netlify Web Deployment

Deploy only `apps/web` to Netlify. The signaling server still needs a separate long-running WebSocket host.

Recommended Netlify project settings:

- Production branch: `main`
- Base directory: leave unset so Netlify uses the repository root
- Package directory: leave unset so npm workspaces install from the repository root
- Build command: read from `netlify.toml`
- Publish directory: read from `netlify.toml`

`netlify.toml` uses:

```toml
[build]
  command = "npm run build:web"
  publish = "apps/web/.next"
```

Environment variables:

```text
NEXT_PUBLIC_SIGNALING_URL=https://your-signaling-server.example.com
```

Optional Netlify environment variable:

```text
NETLIFY_NEXT_SKEW_PROTECTION=true
```

Use this if you want Netlify's Next.js skew protection for production deployments.

## Signaling Server Deployment

The signaling server requires WebSocket support and must run as a persistent Node service. Vercel serverless functions are not suitable for this Socket.IO service.

Build and run with Docker:

```bash
docker build -f apps/signaling-server/Dockerfile -t easydrop-signaling .
docker run \
  -p 4000:4000 \
  -e PORT=4000 \
  -e CLIENT_ORIGIN=https://your-vercel-app.vercel.app \
  -e REDIS_URL=redis://your-redis-host:6379 \
  easydrop-signaling
```

Required environment variables:

- `PORT`: usually `4000`, or the platform-provided port.
- `CLIENT_ORIGIN`: the deployed web app origin.
- `REDIS_URL`: Redis connection URL. If omitted, sessions are stored in memory and will disappear on restart.

## Production Notes

- Use HTTPS for both the Vercel web URL and signaling server URL.
- WebRTC local-network transfers can work without TURN in the MVP, but some networks may still block direct peer connections.
- After deploying the signaling server, redeploy the Vercel web app with the final `NEXT_PUBLIC_SIGNALING_URL`.
