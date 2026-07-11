#!/bin/sh
set -e

if [ "$1" = "healthcheck" ]; then
    curl -sf "http://localhost:${PORT:-80}/health" > /dev/null 2>&1 || exit 1
    exit 0
fi

exec node server.js
