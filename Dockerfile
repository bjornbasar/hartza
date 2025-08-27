FROM node:20-alpine AS base
WORKDIR /app
ENV CI=true

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++ openssl
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; \
    elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
    else npm i; fi

FROM deps AS builder
COPY . .
RUN if [ -d prisma ]; then npx prisma generate || true; fi
RUN npm run build || true

FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm","run","dev"]

FROM base AS prod
ENV NODE_ENV=production
EXPOSE 3000
COPY --from=builder /app .
CMD ["npm","run","start"]
