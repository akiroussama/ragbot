FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@8.12.0 --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/*/package.json packages/*/
RUN pnpm install
COPY . .
EXPOSE 3001
CMD ["pnpm", "--filter=admin", "dev", "-p", "3001"]

# Builder stage
FROM base AS builder
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/*/package.json packages/*/
RUN pnpm install
COPY . .
RUN pnpm --filter=admin build

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs
EXPOSE 3001
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/admin/server.js"]