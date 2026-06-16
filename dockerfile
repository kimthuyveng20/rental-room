# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN npm install -g pnpm 

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build the source code
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Provide a default fallback for Next.js build-time compilation
ENV DATABASE_URL="postgresql://kimthuy:kimthuy1997@postgres:5432/rental_room"

RUN pnpm build

# Stage 3: Minimal production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 1. Copy basic public web assets
COPY --from=builder /app/public ./public

# 2. Copy optimized Next.js standalone engine files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 3. CRITICAL DRiZZLE FIX: Explicitly copy your runtime migration files
COPY --from=builder /app/migrate.ts ./migrate.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations

# 4. Copy node modules & configurations needed for execution
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000

# Simply boot up the server. (We will handle migration triggers via docker compose exec)
CMD ["node", "server.js"]