# Deployment

EasyDrop has two deployable parts:

- `apps/web`: Next.js UI. Deploy this to a host that supports Next.js.
- `apps/signaling-server`: Fastify + Socket.IO signaling server. Deploy this as a long-running Node process, for example with Docker on a VPS, Railway, Render, Fly.io, or similar.

Production deployments should use the `main` branch.

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

## Signaling Server Deployment

The signaling server requires WebSocket support and must run as a persistent Node service. Serverless functions are not suitable for this Socket.IO service.

Build and run with Docker:

```bash
docker build -f apps/signaling-server/Dockerfile -t easydrop-signaling .
docker run \
  -p 4000:4000 \
  -e PORT=4000 \
  -e CLIENT_ORIGIN=https://your-web-app.example.com \
  -e REDIS_URL=redis://your-redis-host:6379 \
  easydrop-signaling
```

Required environment variables:

- `PORT`: usually `4000`, or the platform-provided port.
- `CLIENT_ORIGIN`: the deployed web app origin.
- `REDIS_URL`: Redis connection URL. If omitted, sessions are stored in memory and will disappear on restart.

## Production Notes

- Use HTTPS for both the web app URL and signaling server URL.
- WebRTC local-network transfers can work without TURN in the MVP, but some networks may still block direct peer connections.
- After deploying the signaling server, redeploy the web app with the final `NEXT_PUBLIC_SIGNALING_URL`.

## GitHub Actions, ECR, and ECS Fargate

The workflow at `.github/workflows/deploy-ecs.yml` deploys both application
images on pushes to `main` and on manual dispatch:

1. GitHub authenticates to AWS through OIDC.
2. The web and signaling Docker images are built and tagged with the commit SHA.
3. Both images are pushed to their configured ECR repositories.
4. A new revision of each service's active task definition is registered with
   the new image.
5. Each ECS service is updated and the workflow waits until it is stable.

Create a GitHub environment named `production`, then configure this environment
secret:

| Secret | Purpose |
| --- | --- |
| `AWS_ROLE_ARN` | IAM role assumed by GitHub Actions through OIDC |

Configure these environment variables:

| Variable | Example |
| --- | --- |
| `AWS_REGION` | `us-east-1` |
| `ECS_CLUSTER` | `easydrop-production` |
| `ECR_WEB_REPOSITORY` | `easydrop-web` |
| `ECR_SIGNALING_REPOSITORY` | `easydrop-signaling` |
| `ECS_WEB_SERVICE` | `easydrop-web` |
| `ECS_SIGNALING_SERVICE` | `easydrop-signaling` |
| `ECS_WEB_CONTAINER_NAME` | `web` |
| `ECS_SIGNALING_CONTAINER_NAME` | `signaling` |
| `NEXT_PUBLIC_SIGNALING_URL` | `https://signal.example.com` |

The ECR repositories, ECS cluster, Fargate task definitions, and ECS services
must already exist. Each service's task definition must contain the matching
container name. Keep runtime configuration such as `CLIENT_ORIGIN` and
`REDIS_URL` in the ECS task definition or AWS Secrets Manager.

The GitHub OIDC role needs permission to obtain an ECR authorization token,
push image layers and manifests to both repositories, inspect and register ECS
task definitions, inspect and update both ECS services, and pass the task
execution and task roles referenced by those task definitions.
