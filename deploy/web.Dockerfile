# The editor, served by Caddy, which also proxies the API to the backend (see Caddyfile).
# Build from the repository root (the editor reads the shared widget catalog at build time):
# docker build -f deploy/web.Dockerfile .

FROM node:24-alpine AS build
WORKDIR /build
COPY shared shared
COPY name-tbd/package.json name-tbd/package-lock.json name-tbd/
RUN cd name-tbd && npm ci
COPY name-tbd name-tbd
RUN cd name-tbd && npm run build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /build/name-tbd/dist/name-tbd/browser /srv
