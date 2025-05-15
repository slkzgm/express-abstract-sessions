# full-path: Dockerfile
# Description: Multi-stage build using Node 23 + PNPM, with Prisma codegen and TS compilation.

############################
# STAGE 1: Builder
############################
FROM node:23-alpine AS builder
WORKDIR /app

# 1) Install a pinned PNPM globally to avoid Corepack issues
RUN npm install -g pnpm@latest-10

# 2) Copy lockfile and manifest first for better caching
COPY pnpm-lock.yaml package.json ./

# 3) Install dependencies
RUN pnpm install

# 4) Copy all source code
COPY . .

# 5) Generate Prisma client
RUN pnpm prisma generate

# 6) Build TypeScript to JavaScript
RUN pnpm run build

############################
# STAGE 2: Production
############################
FROM node:23-alpine AS production
WORKDIR /app

# 1) Install PNPM (to run prisma migrate if needed)
RUN npm install -g pnpm@latest-10

# 2) Copy production artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/pnpm-lock.yaml ./

# 3) Expose application port
EXPOSE 3000

# 4) Default command (starts compiled build)
CMD ["pnpm", "run", "start:prod"]
