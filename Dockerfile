# syntax=docker/dockerfile:1.7
# Story 10.1: Multi-stage image for serving scratch-gui playground from a
# hardened non-root nginx. Build-once-deploy-many via runtime envsubst of
# MIDDLEWARE_WS_URL into /env-config.js.

# ─── Stage 1: builder ──────────────────────────────────────────────────────
FROM node:24.15.0-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS builder
WORKDIR /src

# Copy full source first. The scratch-gui workspace has a `prepare` lifecycle
# script (scripts/prepare.mjs — extracts media-library zips) that requires the
# source tree to be present, so manifest-only priming won't work. The root
# package's `prepare: husky install` is git-only — we run it skipped via
# --ignore-scripts and then trigger only scratch-gui's prepare explicitly.
COPY . .
RUN npm ci --workspaces --include-workspace-root --ignore-scripts && \
    npm rebuild && \
    npm run --workspace=packages/scratch-gui prepare
ENV NODE_ENV=production
# Root build runs all workspaces in dependency order
# (task-herder → scratch-svg-renderer → scratch-render → scratch-vm → scratch-gui → scratch-media-lib-scripts).
# scratch-gui's webpack consumes the `dist/` outputs of the upstream packages
# via their `main` fields, so building scratch-gui in isolation fails on
# "Cannot find module '@scratch/scratch-vm'".
RUN npm run build
RUN node -p "require('./package.json').version" > /src/VERSION

# ─── Stage 2: runtime ──────────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:1.27-alpine@sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0 AS runtime
# Base image USER is already 101 (nginx). No USER root needed — env-config.js
# renders to /tmp (world-writable) and the template reads from /usr/share/...
# (world-readable). /usr/share/nginx/html stays read-only, so a future Helm
# chart can set `readOnlyRootFilesystem: true` without shadowing the assets.

# Deployable subset of build/ only — drop standalone/player/blocks-only/compatibility
# HTML entries and their ~16 MB sibling bundles (not part of the public web service).
COPY --from=builder /src/packages/scratch-gui/build/index.html               /usr/share/nginx/html/
COPY --from=builder /src/packages/scratch-gui/build/gui.js                   /usr/share/nginx/html/
COPY --from=builder /src/packages/scratch-gui/build/gui.js.LICENSE.txt       /usr/share/nginx/html/
COPY --from=builder /src/packages/scratch-gui/build/extension-worker.js      /usr/share/nginx/html/
COPY --from=builder /src/packages/scratch-gui/build/extension-worker.js.LICENSE.txt /usr/share/nginx/html/
COPY --from=builder /src/packages/scratch-gui/build/30d09ba32a17082ef820b57d52d60b7b.hex /usr/share/nginx/html/
COPY --from=builder /src/packages/scratch-gui/build/chunks/ /usr/share/nginx/html/chunks/
COPY --from=builder /src/packages/scratch-gui/build/static/ /usr/share/nginx/html/static/
COPY --from=builder /src/VERSION /usr/share/nginx/html/VERSION

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# Flat path under /usr/share/ — avoids /etc/nginx/templates/ (the base image's
# 20-envsubst-on-templates.sh would render anything in there to the wrong
# place). Our own 30-spark-env.sh reads from here and writes to /tmp.
COPY docker/env-config.js.template /usr/share/spark.env-config.js.template
COPY --chmod=0755 docker/30-spark-env.sh /docker-entrypoint.d/30-spark-env.sh

EXPOSE 8080
# Base image's ENTRYPOINT/CMD already invokes /docker-entrypoint.d/*.sh then nginx -g 'daemon off;'.
