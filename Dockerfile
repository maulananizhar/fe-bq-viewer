# ---- Build Stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage (Node.js) ----
FROM node:20-alpine

RUN apk add --no-cache tini curl

# Use non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Built assets
COPY --from=build /app/dist ./dist

# Server entrypoint
COPY server.js .
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Configurable env vars (override at runtime via Coolify / docker -e)
ENV PORT=80 \
    BACKEND_HOST=backend \
    BACKEND_PORT=5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD /docker-entrypoint.sh healthcheck

USER appuser

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
