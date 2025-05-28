FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/*/package.json packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the API
RUN pnpm --filter=api build

# Production stage
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/

# Copy built application
COPY --from=base /app/apps/api/dist apps/api/dist
COPY --from=base /app/packages packages

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"] 