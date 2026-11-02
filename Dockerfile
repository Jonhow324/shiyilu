# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# 数据、封面、快照都落在这一层，外面用卷挂住
ENV NAV_DB_PATH=/data/nav.db
ENV NAV_ARCHIVE_DIR=/data

RUN apt-get update && apt-get install -y --no-install-recommends libsqlite3-0 \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data \
  && chown node:node /data

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/package.json ./package.json
# 种子脚本要编译 TypeScript，tsx 不在 standalone 的依赖里
COPY --from=deps --chown=node:node /app/node_modules/tsx ./node_modules/tsx
COPY --from=deps --chown=node:node /app/node_modules/esbuild ./node_modules/esbuild

USER node
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
