# syntax=docker/dockerfile:1
# sbx-template: workload.dockerfile 0.1.2
#
# Agent-free workload for this repository: Node 24 (.nvmrc), the system
# libraries and X server the Playwright tests need, Chromium with chromedriver
# for scratch-gui's Selenium integration tests, the toolchain to build canvas,
# and Docker Engine. Claude Code and the company layer come from mixins
# (sbxenv.yaml).
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

# Shared libraries headless Chromium needs (Playwright's debian13 "chromium"
# list), plus fonts so pages and emoji render. The browser itself comes from
# the base-toolkit mixin, for chrome-devtools-mcp.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 libatspi2.0-0t64 \
      libcairo2 libcups2t64 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0t64 \
      libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcb1 libxcomposite1 \
      libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 \
      libfontconfig1 libfreetype6 fonts-liberation fonts-noto-color-emoji \
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

# Docker Engine from Docker's apt repo. sbx starts dockerd itself, but only
# runs the container in Docker-in-Docker mode (the privileges dockerd needs
# for iptables, plus a volume at /var/lib/docker) when the image carries the
# start-docker label.
LABEL com.docker.sandboxes.start-docker="true"
RUN install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && printf 'Types: deb\nURIs: https://download.docker.com/linux/debian\nSuites: %s\nComponents: stable\nSigned-By: /etc/apt/keyrings/docker.asc\n' \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" > /etc/apt/sources.list.d/docker.sources \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*

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

# The `agent` user (uid/gid 1000) in the docker group, with the home layout
# the sandbox runtime expects.
RUN groupadd --gid 1000 agent \
 && useradd --uid 1000 --gid 1000 --groups docker --create-home --shell /bin/bash agent \
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
 && command -v xvfb-run \
 && command -v dockerd && docker compose version

WORKDIR /home/agent/workspace
ENTRYPOINT ["bash"]
CMD ["-l"]
