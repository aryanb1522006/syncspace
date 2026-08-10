FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN pnpm install --frozen-lockfile --filter @syncspace/client...
COPY client client
ARG VITE_DEMO_MODE=false
ARG VITE_API_URL=/api
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @syncspace/client build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 8080
