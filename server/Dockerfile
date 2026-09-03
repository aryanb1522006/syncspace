# Debian-based "slim" image (glibc), not "alpine" (musl). The optional
# semantic-embedding path (EMBEDDING_PROVIDER=transformers) depends on
# onnxruntime-node, which ships prebuilt native binaries linked against
# glibc (libc.so.6, libstdc++.so.6, etc.) - these fail to load on Alpine's
# musl libc even with `gcompat` installed. bookworm-slim keeps the image
# small while staying glibc-compatible.
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN pnpm install --frozen-lockfile --prod --filter @syncspace/server...

COPY server server
# .cache/transformers: mount point for the optional EMBEDDING_CACHE_DIR
# (persists downloaded transformers model weights across restarts). Must
# exist with the right ownership *before* a named volume mounts over it,
# or Docker creates the mount point as root and the non-root `node` user
# below can't write to it.
RUN mkdir -p /app/server/uploads /app/server/.cache/transformers && chown -R node:node /app

USER node
WORKDIR /app/server
EXPOSE 4000
CMD ["node", "src/server.js"]
