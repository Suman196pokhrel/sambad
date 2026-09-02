# syntax=docker/dockerfile:1
# Dockerfile
# Builds the Sambad frontend image. Compiles the Vite app to static
# files, then serves them with Caddy, the same proxy technology
# already used at the top of the stack, instead of adding nginx just
# for this one container.

FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


FROM caddy:2-alpine

COPY --from=builder /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
