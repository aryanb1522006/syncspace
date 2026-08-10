FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN pnpm install --frozen-lockfile --prod --filter @syncspace/server...

COPY server server
RUN mkdir -p /app/server/uploads && chown -R node:node /app

USER node
WORKDIR /app/server
EXPOSE 4000
CMD ["node", "src/server.js"]
