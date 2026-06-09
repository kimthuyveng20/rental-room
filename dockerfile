# --- Stage 1: Build Stage ---
FROM node:20-alpine3.18 AS builder
WORKDIR /app

# 1. Install pnpm globally inside the container
RUN npm install -g pnpm

# 2. Copy package.json AND your pnpm lockfile
COPY package.json pnpm-lock.yaml* ./

# 3. Change "npm ci" to the correct pnpm command
RUN pnpm install --frozen-lockfile

# 4. Copy the rest of your source files
COPY . .

# 5. Copy the generated .env file from GitHub Actions
COPY .env ./ 

# 6. Run the build
RUN pnpm run build