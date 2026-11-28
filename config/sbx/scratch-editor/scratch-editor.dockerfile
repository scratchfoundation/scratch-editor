# syntax=docker/dockerfile:1
# sbx-template: workload.dockerfile 0.1.4
#
# Agent-free workload for this repository: Node 24 (.nvmrc), the system
# libraries and X server the Playwright tests need, Chromium with chromedriver
# for scratch-gui's Selenium integration tests, and the toolchain to build
# canvas. No Docker Engine: the project runs no containers, and without it the
# agent isn't in the docker group, so it isn't root in the VM. Claude Code and
# the global layer come from mixins (sbxenv.yaml).
#
# Base image requirements:
# https://docs.docker.com/ai/sandboxes/customize/author/base-images/

# Node from .nvmrc, which CI also reads (actions/setup-node node-version-file).
# It also runs the base-toolkit mixin's chrome-devtools-mcp (needs >= 20.19).
FROM node:24.22.0-trixie AS node

FROM debian:trixie

USER root

# Platform floor (bash, git, CA store) plus everyday tools.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git openssh-client \
      jq less procps unzip xz-utils vim \
 && rm -rf /var/lib/apt/lists/*

# Fonts so pages and emoji render. The shared libraries Chromium needs come
# from `playwright install-deps` below; the browser chrome-devtools-mcp drives
# comes from the base-toolkit mixin.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      fonts-liberation fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/*

# scratch-gui's integration tests (test/helpers/selenium-helper.js) drive
# Chrome through chromedriver on PATH; Debian's chromium and chromium-driver
# are a matching pair on both amd64 and arm64. xvfb-run gives Firefox the
# display it needs: scratch-gui's Playwright tests run it headed, because
# headless Firefox has no WebGL (.github/actions/test-package/action.yml).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      chromium chromium-driver xvfb xauth \
 && rm -rf /var/lib/apt/lists/*

# canvas (scratch-paint, scratch-svg-renderer) is built from source: its
# linux-arm64 prebuilt bundles a libcairo that can't load under the VM
# kernel's 16K pages on Apple silicon. These are the libraries CI checks for
# (.github/actions/install-dependencies/action.yml) plus the compiler.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential python3 pkg-config \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libssl-dev \
 && rm -rf /var/lib/apt/lists/*
# prebuild-install (canvas's install script) reads this file and falls back to
# node-gyp. canvas is the only package here that uses prebuild-install.
RUN printf 'buildFromSource=true\n' > /etc/prebuild-installrc

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node /usr/local/include/node /usr/local/include/node
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && ln -s ../lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack

# System packages for the browsers the project's Playwright tests download at
# run time (`npx playwright install chromium firefox`, the CI step without
# --with-deps, which needs root). The kit's build context can't read
# package-lock.json; keep the version near @playwright/test's there.
RUN npx --yes playwright@1.64.1 install-deps chromium firefox \
 && rm -rf /var/lib/apt/lists/* /root/.npm

# The `agent` user (uid/gid 1000), with the home layout the sandbox runtime
# expects.
RUN groupadd --gid 1000 agent \
 && useradd --uid 1000 --gid 1000 --create-home --shell /bin/bash agent \
 && mkdir -p /home/agent/workspace /home/agent/.local/bin \
      /home/agent/.local/share /home/agent/.local/state /home/agent/.config \
      /home/agent/.docker/sandbox/locks \
 && chown -R agent:agent /home/agent

# The npm global prefix lives in the agent's home, so `npm install -g` works
# without root.
ENV HOME=/home/agent \
    NPM_CONFIG_PREFIX=/home/agent/.local \
    PATH=/home/agent/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    BASH_ENV=/etc/sandbox-persistent.sh \
    CLAUDE_ENV_FILE=/etc/sandbox-persistent.sh

# Persistent env file, read by login, interactive and non-interactive bash.
# You (and the agent) can put persistent env vars here. Debian's /etc/profile
# resets PATH for login shells, so 00-path.sh restores the PATH set above (and
# runs before sandbox-persistent.sh, which may extend it).
RUN touch /etc/sandbox-persistent.sh \
 && chown agent:agent /etc/sandbox-persistent.sh \
 && chmod 0644 /etc/sandbox-persistent.sh \
 && printf '%s\n' '. /etc/sandbox-persistent.sh' > /etc/profile.d/sandbox-persistent.sh \
 && printf '%s\n' '. /etc/sandbox-persistent.sh' >> /home/agent/.bashrc \
 && printf 'export PATH="%s"\n' "$PATH" > /etc/profile.d/00-path.sh

# MCP: this project's MCP servers, added to the global allowlist in
# /etc/claude-code/managed-settings.json (Claude Code merges the files in
# managed-settings.d/ into it). One entry per server, e.g.
# {"serverUrl": "https://mcp.example.com/*"} or {"serverCommand": ["example-mcp"]};
# config/sbx/REFERENCE.md "MCP servers" says what else each kind needs.
COPY <<'JSON' /etc/claude-code/managed-settings.d/50-project.json
{
  "allowedMcpServers": []
}
JSON

USER agent

# Point the tools that don't read the system CA store at it; without this,
# TLS through the sbx proxy fails for them.
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt \
    CURL_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Output versions, for verification
RUN node --version \
 && npm --version \
 && chromium --version \
 && chromedriver --version \
 && command -v xvfb-run

WORKDIR /home/agent/workspace
ENTRYPOINT ["bash"]
CMD ["-l"]
