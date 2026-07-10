#!/bin/sh
set -e

if [ "$1" = "healthcheck" ]; then
    curl -sf "http://localhost:${NGINX_PORT:-80}/" > /dev/null 2>&1 || exit 1
    exit 0
fi

# Substitute only our env vars — nginx's own $variables stay untouched
envsubst '${NGINX_PORT} ${BACKEND_HOST} ${BACKEND_PORT}' \
    < /etc/nginx/conf.d/default.conf.template \
    > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
