# ---- Build Stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage (Nginx) ----
FROM nginx:1.27-alpine

# Tools: envsubst (from gettext) + healthcheck curl
RUN apk add --no-cache gettext curl

# Built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config template + entrypoint
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Configurable env vars (override at runtime via Coolify / docker -e)
ENV NGINX_PORT=80 \
    BACKEND_HOST=backend \
    BACKEND_PORT=5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD /docker-entrypoint.sh healthcheck

ENTRYPOINT ["/docker-entrypoint.sh"]
