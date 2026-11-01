# Satu container image untuk aplikasi Next.js (ADR-0021).
#
#   docker build -t rusuh-fe \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
#     --build-arg NEXT_DEPLOYMENT_ID=$(git rev-parse --short HEAD) .
#   docker run --rm -p 3000:3000 rusuh-fe

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo

# 1. Install dependency hanya dari lockfile. Layer ini di-cache selama package.json dan package-lock.json
#    tidak berubah. --ignore-scripts: image tidak butuh hook Husky dari script `prepare`.
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund

# 2. Salin source (node_modules dikecualikan .dockerignore, jadi hasil `npm ci` tidak tertimpa), lalu build.
FROM deps AS build
COPY . .

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
RUN npm run build

# 3. Runtime: hanya hasil standalone, user non-root, tanpa devDependencies dan tanpa source.
FROM node:${NODE_VERSION}-alpine AS run
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app

COPY --from=build --chown=app:app /repo/.next/standalone ./
COPY --from=build --chown=app:app /repo/.next/static ./.next/static
COPY --from=build --chown=app:app /repo/public ./public

USER app
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

# tini meneruskan SIGTERM ke Node: Next menyelesaikan request yang sedang berjalan sebelum keluar.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
