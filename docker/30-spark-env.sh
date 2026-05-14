#!/bin/sh
set -e
: "${MIDDLEWARE_WS_URL:=}"
if [ -f /usr/share/nginx/html/VERSION ]; then
  SPARK_VERSION=$(cat /usr/share/nginx/html/VERSION)
else
  SPARK_VERSION="dev"
fi
export MIDDLEWARE_WS_URL SPARK_VERSION
envsubst '${MIDDLEWARE_WS_URL} ${SPARK_VERSION}' \
  < /etc/spark/env-config.js.template \
  > /usr/share/nginx/html/env-config.js
echo "[spark] env-config.js rendered: MIDDLEWARE_WS_URL='${MIDDLEWARE_WS_URL}' VERSION='${SPARK_VERSION}'"
