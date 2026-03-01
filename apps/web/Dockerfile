FROM node:18-alpine AS build
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @car-auction/shared build
RUN pnpm --filter @car-auction/web build

FROM nginx:alpine
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
