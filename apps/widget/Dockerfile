FROM node:25-alpine AS base

RUN corepack enable && corepack prepare pnpm@8.12.0 --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/widget/package.json apps/widget/
COPY packages/*/package.json packages/*/
RUN pnpm install
COPY . .
EXPOSE 3002
CMD ["pnpm", "--filter=widget", "dev"]

# Builder stage
FROM base AS builder
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/widget/package.json apps/widget/
COPY packages/*/package.json packages/*/
RUN pnpm install
COPY . .
RUN pnpm --filter=widget build

# Production stage with nginx
FROM nginx:alpine AS production
COPY --from=builder /app/apps/widget/dist /usr/share/nginx/html
COPY apps/widget/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]