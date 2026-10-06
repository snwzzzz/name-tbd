# The flow sidecar: runs workflows on the server with the browser's engine (name-tbd/src/flow-engine).
# Only the backend calls it (POST /run), on the compose network; it isn't published.
# Build from the repository root: docker build -f deploy/flows.Dockerfile .

FROM node:24-alpine AS build
WORKDIR /build
COPY name-tbd/package.json name-tbd/package-lock.json name-tbd/
RUN cd name-tbd && npm ci
COPY name-tbd name-tbd
RUN cd name-tbd && npm run build:sidecar

FROM node:24-alpine
WORKDIR /app
COPY --from=build /build/name-tbd/dist/flow-sidecar/sidecar.mjs .
USER node
ENV FLOW_SIDECAR_PORT=8090
EXPOSE 8090
CMD ["node", "sidecar.mjs"]
