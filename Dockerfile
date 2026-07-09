# syntax=docker/dockerfile:1

# Nixpacks builds a ~2.5 GB image (Ubuntu base + a full Nix store + the entire
# 332 MB node_modules tree) and fails while exporting layers on a small server.
# This produces a runtime image roughly a tenth of that by using Next's
# standalone output, which traces only the modules the server actually reaches.

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------- dependencies
FROM node:${NODE_VERSION} AS deps
# Next's SWC binaries are glibc-linked; Alpine needs the compat shim.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# corepack ships with Node and reads `packageManager` from package.json, so the
# pnpm version here can never drift from the one that produced the lockfile.
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --------------------------------------------------------------------- builder
FROM node:${NODE_VERSION} AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---------------------------------------------------------------------- runner
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# server.js honours both. HOSTNAME must be 0.0.0.0 or the container is
# unreachable from outside even though the process is running.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: "standalone"` does NOT include these two. Copy them explicitly or the
# app boots with no CSS, no JS chunks, and no product photos.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Not `next start` — standalone has its own entrypoint and no next binary.
CMD ["node", "server.js"]
