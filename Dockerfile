# Use Node 20 if you're on a Pi 3 (armv7). If you're x86/arm64, Node 22 is fine.
# FROM --platform=linux/arm/v7 node:20-alpine AS base
FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true

FROM base AS deps
RUN apk add --no-cache curl g++ libc6-compat make openssl python3
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; \
    elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
    else npm i; fi

FROM deps AS builder
COPY . .
# Generate prisma client if present
RUN if [ -d prisma ]; then npx prisma generate || true; fi
RUN npm run build || true

# Dev image: keep deps, rely on bind mount for source, use polling for NFS
FROM deps AS dev
ENV NODE_ENV=development \
    CHOKIDAR_USEPOLLING=1 \
    WATCHPACK_POLLING=true
EXPOSE 3000
# Optional: small entrypoint to regen prisma client on schema change
COPY docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint
RUN chmod +x /usr/local/bin/dev-entrypoint
CMD ["dev-entrypoint"]

# Prod image: baked build, no bind mounts needed
FROM base AS prod
ENV NODE_ENV=production
EXPOSE 3000
COPY --from=builder /app ./
CMD ["npm","run","start"]

