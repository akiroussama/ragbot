FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./

# Copy all package.json files
COPY packages/*/package.json ./packages/*/
COPY apps/*/package.json ./apps/*/

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Development stage
FROM base AS development
EXPOSE 3000
CMD ["pnpm", "--filter=web", "dev"]

# Build stage
FROM base AS builder
RUN pnpm --filter=web build

# Production stage
FROM node:20-alpine AS production
RUN npm install -g pnpm
WORKDIR /app

# Copy built application
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["pnpm", "--filter=web", "start"]