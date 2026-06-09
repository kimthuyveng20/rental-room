# --- Stage 2: Production Run Stage ---
FROM node:20-alpine3.18 AS runner
WORKDIR /app

ENV NODE_ENV=production

# 1. Install pnpm globally in the runner stage too
RUN npm install -g pnpm

# 2. Copy your package files over
COPY package.json pnpm-lock.yaml* ./

# 3. FIX: Change "npm ci --omit=dev" to the correct pnpm production command
RUN pnpm install --prod --frozen-lockfile

# 4. Copy the built production bundle from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js 2>/dev/null || true

EXPOSE 5000

# 5. Start the application using pnpm
CMD ["pnpm", "run", "start"]