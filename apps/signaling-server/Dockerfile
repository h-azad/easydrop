FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/signaling-server/package.json apps/signaling-server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/transfer/package.json packages/transfer/package.json
COPY packages/webrtc/package.json packages/webrtc/package.json
RUN npm ci

FROM deps AS builder
COPY apps/signaling-server apps/signaling-server
COPY packages packages
RUN npm run build:server

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/signaling-server/package.json ./apps/signaling-server/package.json
COPY --from=builder /app/apps/signaling-server/dist ./apps/signaling-server/dist
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@easydrop/signaling-server"]
