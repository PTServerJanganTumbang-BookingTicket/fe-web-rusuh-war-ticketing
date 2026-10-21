# Satu container image untuk apps/web. packages/* ter-compile ke dalam build Next.js (ADR-0013).
#
#   docker build -t rusuh-fe \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
#     --build-arg NEXT_DEPLOYMENT_ID=$(git rev-parse --short HEAD) .
#   docker run --rm -p 3000:3000 rusuh-fe

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# 1. Unduh dependency hanya dari lockfile. Layer ini di-cache selama pnpm-lock.yaml tidak berubah.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch

# 2. Install offline dari store, lalu build.
FROM deps AS build
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile

# Nilai NEXT_PUBLIC_* di-inline ke bundle saat build, jadi satu image = satu konfigurasi environment.
# NEXT_PUBLIC_API_MOCKING sengaja kosong: kode MSW dilipat keluar dari bundle produksi.
ARG NEXT_PUBLIC_API_BASE_URL=https://api.rusuh.test
ARG NEXT_PUBLIC_API_MOCKING=
ARG NEXT_PUBLIC_BOOKING_EXPIRY=queue
# Versi deployment untuk proteksi version skew saat rolling deploy (?dpl= di aset, header x-deployment-id).
ARG NEXT_DEPLOYMENT_ID=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_API_MOCKING=$NEXT_PUBLIC_API_MOCKING \
    NEXT_PUBLIC_BOOKING_EXPIRY=$NEXT_PUBLIC_BOOKING_EXPIRY \
    NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID
RUN pnpm build

# 3. Runtime: hanya hasil standalone, user non-root, tanpa pnpm dan tanpa source.
FROM node:${NODE_VERSION}-alpine AS run
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app

COPY --from=build --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /repo/apps/web/public ./apps/web/public

USER app
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

# tini meneruskan SIGTERM ke Node: Next menyelesaikan request yang sedang berjalan sebelum keluar.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
