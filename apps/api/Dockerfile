FROM node:25-alpine AS base

RUN corepack enable && corepack prepare pnpm@8.12.0 --activate
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/*/package.json packages/*/
RUN pnpm install
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter=api", "dev"]

# Builder stage
FROM base AS builder
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/*/package.json packages/*/
RUN pnpm install
COPY . .
RUN pnpm --filter=api build

# Production stage
FROM node:25-alpine AS production
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/turbo.json ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/packages packages
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules

ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]