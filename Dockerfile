# ==============================================================================
# DashPark Production Dockerfile (Multi-Stage, Multi-Arch)
# Target Architectures: linux/amd64, linux/arm64 (Raspberry Pi 3/4/5)
# Repository: https://github.com/jack11122233311/DashPark
# ==============================================================================

# --- Stage 1: Build & Prune Dependencies ---
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json tsconfig*.json vite.config.ts ./
RUN npm ci

# Copy source code and config assets
COPY src/ ./src/
COPY config/ ./config/
COPY index.html ./

# Build frontend and backend TypeScript
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev

# --- Stage 2: Minimal Production Runtime ---
FROM node:22-alpine AS runner

LABEL org.opencontainers.image.title="DashPark" \
      org.opencontainers.image.description="Ultra-lightweight, modern, self-hosted dashboard for homelabs and servers" \
      org.opencontainers.image.url="https://github.com/jack11122233311/DashPark" \
      org.opencontainers.image.source="https://github.com/jack11122233311/DashPark" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Create necessary directories and set ownership to non-root user 'node' (UID: 1000)
RUN mkdir -p /app/config /app/icons /app/dist && \
    chown -R node:node /app

# Copy production node_modules and built application from builder stage
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/config/dashpark.sample.yaml ./config/dashpark.sample.yaml

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Expose default HTTP port
EXPOSE 3000

# Non-blocking health check using native Alpine wget
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/v1/health || exit 1

# Execute as non-root user for maximum security
USER node

# Start DashPark server
CMD ["node", "dist/server/index.js"]
