# ============================================
# ChainEquity Backend - Multi-stage Dockerfile
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy backend source code
COPY backend/ .

# Copy CLI from root directory
COPY cli.ts ./cli.ts

# Build TypeScript to JavaScript
RUN npm run build

# ============================================
# Stage 2: Production Runtime
FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force && \
    apk del python3 make g++

# Copy built files from builder stage (includes schema.sql from build process)
COPY --from=builder /app/dist ./dist

# Copy CLI file from builder stage
COPY --from=builder /app/cli.ts ./cli.ts

# Install tsx globally for running TypeScript CLI and CLI dependencies
# Do this before switching to node user
RUN npm install -g tsx && \
    npm install --save chalk@5.6.2 commander@14.0.2 cli-table3@0.6.5 ora@9.0.0 inquirer@12.10.0

# Create data directory for SQLite database
RUN mkdir -p /app/data && \
    chown -R node:node /app/data && \
    chown -R node:node /app

# Use non-root user for security
USER node

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command (can be overridden in docker-compose)
CMD ["node", "dist/server.js"]
