FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/signaling-server/package.json apps/signaling-server/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/transfer/package.json packages/transfer/package.json
COPY packages/webrtc/package.json packages/webrtc/package.json
RUN npm ci

FROM deps AS builder
ARG NEXT_PUBLIC_SIGNALING_URL=http://localhost:4000
ENV NEXT_PUBLIC_SIGNALING_URL=$NEXT_PUBLIC_SIGNALING_URL
COPY apps/web apps/web
COPY packages packages
RUN npm run build:web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@easydrop/web"]
