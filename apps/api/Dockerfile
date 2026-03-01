FROM node:18-alpine AS build
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @car-auction/shared build
RUN pnpm --filter @car-auction/api build

FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/index.js"]
