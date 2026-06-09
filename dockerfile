# --- Stage 1: Build Stage ---
FROM node:20-alpine3.18 AS builder
WORKDIR /app

# Copy dependency structures
COPY package*.json ./

# Install ALL dependencies (including devDependencies like Tailwind/PostCSS)
RUN npm ci

# Copy the source code
COPY . .

# Build the Next.js application
RUN npm run build

# --- Stage 2: Production Run Stage ---
FROM node:20-alpine3.18 AS runner
WORKDIR /app

# Set production context
ENV NODE_ENV=production

# Copy package info to handle production runner binaries
COPY package*.json ./

# Only install what's critical to run the app (ignores devDependencies)
RUN npm ci --omit=dev

# Copy the built production bundle and public assets from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js 2>/dev/null || true

EXPOSE 3000

CMD ["npm", "run", "start"]