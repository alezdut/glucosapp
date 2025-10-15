FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate
# Copy workspace config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# Copy shared package manifests
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/env/package.json ./packages/env/
# Copy backend package files
COPY apps/backend/package.json apps/backend/tsconfig.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma
# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

FROM deps AS build
# Copy shared packages (config, types, env)
COPY packages/config ./packages/config
COPY packages/types/src ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/env/src ./packages/env/src
COPY packages/env/tsconfig.json ./packages/env/
# Build shared packages first
WORKDIR /app
RUN pnpm --filter @glucosapp/types build && pnpm --filter @glucosapp/env build
# Copy backend source (including email templates)
COPY apps/backend/src ./apps/backend/src
# Build backend
WORKDIR /app/apps/backend
RUN pnpm prisma:generate && pnpm build
# Copy email templates to dist folder
RUN mkdir -p dist/modules/auth/templates && \
    cp -r src/modules/auth/templates/*.html dist/modules/auth/templates/

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/backend
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate
# Copy node_modules for backend and shared packages
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/backend/node_modules ./node_modules
# Copy built backend
COPY --from=build /app/apps/backend/dist ./dist
# Copy prisma schema for runtime
COPY --from=deps /app/apps/backend/prisma ./prisma
# Copy built shared packages
COPY --from=build /app/packages/types /app/packages/types
COPY --from=build /app/packages/env /app/packages/env
EXPOSE 3000
CMD ["node", "dist/main.js"]

