FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate
# Copy backend package files into their project directory
COPY apps/backend/package.json apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma
# Install only backend deps
RUN pnpm -C apps/backend install --frozen-lockfile=false

FROM deps AS build
# Provide shared config so tsconfig extends can resolve: ../../packages/config/tsconfig/base.json
COPY packages/config ./packages/config
# Copy source
COPY apps/backend/src ./apps/backend/src
WORKDIR /app/apps/backend
RUN pnpm prisma:generate && pnpm build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/backend
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate
COPY --from=deps /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=deps /app/apps/backend/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]

