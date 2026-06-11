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

# Generate Prisma client ONLY if the prisma directory exists
RUN if [ -d "prisma" ]; then pnpm prisma generate; fi

RUN pnpm build

# Stage 3: Minimal production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy basic public assets
COPY --from=builder /app/public ./public

# Safely verify and copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# SAFE SOLUTION: Instead of crashing if prisma is missing, copy everything from builder 
# except large source folders, or dynamically check if it exists.
COPY --from=builder /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

# Execute database migrations automatically ONLY if Prisma exists, otherwise just boot the server
CMD ["sh", "-c", "if [ -d 'prisma' ]; then npx prisma migrate deploy; fi && node server.js"]