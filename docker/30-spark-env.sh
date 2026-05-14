#!/bin/sh
set -e
: "${MIDDLEWARE_WS_URL:=}"

# Allow only ws:// or wss:// URLs built from a safe character set. By
# restricting via allow-list we also block the chars that would break the
# single-quoted JS string literal in env-config.js (', `, $, newline).
# Empty is allowed — the Spark extension's || fallback handles it.
if [ -n "$MIDDLEWARE_WS_URL" ]; then
  if ! printf '%s' "$MIDDLEWARE_WS_URL" | grep -Eq '^wss?://[A-Za-z0-9._:/?#=&%@~+-]+$'; then
    echo "[spark] ERROR: MIDDLEWARE_WS_URL must match ws://|wss:// + [A-Za-z0-9._:/?#=&%@~+-]+ (got: ${MIDDLEWARE_WS_URL})" >&2
    exit 1
  fi
fi

if [ -f /usr/share/nginx/html/VERSION ]; then
  SPARK_VERSION=$(cat /usr/share/nginx/html/VERSION)
else
  SPARK_VERSION="dev"
fi
export MIDDLEWARE_WS_URL SPARK_VERSION
envsubst '${MIDDLEWARE_WS_URL} ${SPARK_VERSION}' \
  < /usr/share/spark.env-config.js.template \
  > /tmp/env-config.js
echo "[spark] env-config.js rendered to /tmp: MIDDLEWARE_WS_URL='${MIDDLEWARE_WS_URL}' VERSION='${SPARK_VERSION}'"
