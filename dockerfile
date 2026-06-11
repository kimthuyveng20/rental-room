# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm globally inside the container
RUN npm install -g pnpm 

# Copy package configurations and lockfile
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build the source code
FROM node:20-alpine AS builder
WORKDIR /app

# Re-install pnpm in the builder stage to handle execution
RUN npm install -g pnpm

# Copy node_modules from deps and the rest of the source code
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client if you use Prisma (Critical step for pnpm)
RUN if [ -d "prisma" ]; then pnpm prisma generate; fi

# Run the build command via pnpm
RUN pnpm build

# Stage 3: Minimal production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy runtime assets and standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Bundle ORM migrations into the production runner safely
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

# Execute database migrations automatically right before spinning up the server
# Using npx is fine here as it will find the prisma binary in node_modules
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]