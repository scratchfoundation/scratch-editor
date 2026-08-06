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
# Build ONLY scratch-gui's dependency closure, in dependency order
# (scratch-svg-renderer → scratch-render → scratch-vm → scratch-gui).
# We deliberately do NOT run the monorepo-wide `npm run build`: the sibling
# `@scratch/task-herder` package builds with rolldown-vite, and rolldown
# 1.0.0-beta.53 fails to resolve its entry module ("[UNRESOLVED_ENTRY]"),
# which aborts the whole workspace build. task-herder is not a dependency of
# scratch-gui and is not shipped in this image, so excluding it is correct
# scoping, not error suppression. (Tracked as a separate task-herder defect.)
# scratch-gui's webpack consumes the upstream packages' `dist/` via their
# `main` fields, so the upstream three must be built first, in this order.
RUN npm run --workspace=packages/scratch-svg-renderer \
            --workspace=packages/scratch-render \
            --workspace=packages/scratch-vm \
            --workspace=packages/scratch-gui build
# Verification gate: fail loudly if the deployable artifact is incomplete,
# so a silently-broken scratch-gui build can never reach the runtime stage.
RUN set -e; \
    d=packages/scratch-gui/build; \
    for f in "$d/index.html" "$d/gui.js"; do \
      test -s "$f" || { echo "FATAL: missing/empty $f" >&2; exit 1; }; \
    done; \
    test -d "$d/chunks" && [ -n "$(ls -A "$d/chunks")" ] || { echo "FATAL: $d/chunks missing/empty" >&2; exit 1; }; \
    test -d "$d/static" && [ -n "$(ls -A "$d/static")" ] || { echo "FATAL: $d/static missing/empty" >&2; exit 1; }; \
    echo "artifact OK: $(du -sh "$d" | cut -f1) in $d"
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

# Story 7.6: firmware update artifacts (firmware/manifest.json + .bin) — generated in the
# BUILD CONTEXT by scripts/fetch-firmware.sh (the deploy-uat fetch step), so copy from context,
# NOT --from=builder. Baked so the same nginx serves /firmware/ alongside Scratch (one host).
COPY firmware/ /usr/share/nginx/html/firmware/

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# Flat path under /usr/share/ — avoids /etc/nginx/templates/ (the base image's
# 20-envsubst-on-templates.sh would render anything in there to the wrong
# place). Our own 30-spark-env.sh reads from here and writes to /tmp.
COPY docker/env-config.js.template /usr/share/spark.env-config.js.template
COPY --chmod=0755 docker/30-spark-env.sh /docker-entrypoint.d/30-spark-env.sh

EXPOSE 8080
# Base image's ENTRYPOINT/CMD already invokes /docker-entrypoint.d/*.sh then nginx -g 'daemon off;'.
