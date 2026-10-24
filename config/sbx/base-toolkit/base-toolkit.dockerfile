# syntax=docker/dockerfile:1
#
# Overlay for the base-toolkit mixin. Everything is fetched at build time on the
# host, so the sandbox needs no install-phase network access for it.
#   /etc/claude-code/managed-settings.json       Claude Code policy (auto mode)
#   /etc/claude-code/CLAUDE.md                   company rules (base-toolkit-context.md), always loaded
#   /etc/gitconfig, /etc/gitignore               HTTPS rewrite for GitHub, global ignores
#   /usr/local/bin/gh                            GitHub CLI
#   /opt/base-toolkit/chrome-devtools-mcp        chrome-devtools-mcp (runs on the workload's Node)
#   /opt/base-toolkit/ms-playwright              Playwright's Chromium build, for the MCP server
#   /usr/local/bin/sandbox-chrome-devtools-mcp   launcher registered in Claude

ARG GH_VERSION=2.102.0
# From gh_<version>_checksums.txt in the release; update with GH_VERSION.
ARG GH_SHA256_AMD64=bb766f710eef8ede859c18578c72c327597cd4c8a85b06001b1f3843c6019386
ARG GH_SHA256_ARM64=7862c86c72f43df3a2d93ddde6f473285b4e2af61b494849846827e513ef6484
ARG CHROME_DEVTOOLS_MCP_VERSION=1.11.0
ARG PLAYWRIGHT_VERSION=1.64.1

FROM node:20.19.6-trixie AS build
ARG TARGETARCH
ARG GH_VERSION
ARG GH_SHA256_AMD64
ARG GH_SHA256_ARM64
ARG CHROME_DEVTOOLS_MCP_VERSION
ARG PLAYWRIGHT_VERSION

RUN case "$TARGETARCH" in \
      amd64) sum="$GH_SHA256_AMD64" ;; \
      arm64) sum="$GH_SHA256_ARM64" ;; \
      *) echo "no gh checksum for $TARGETARCH" >&2; exit 1 ;; \
    esac \
 && mkdir -p /out/usr/local/bin \
 && curl -fsSL -o /tmp/gh.tar.gz "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${TARGETARCH}.tar.gz" \
 && echo "$sum  /tmp/gh.tar.gz" | sha256sum -c - \
 && tar -xzf /tmp/gh.tar.gz -C /tmp \
 && install -m 0755 "/tmp/gh_${GH_VERSION}_linux_${TARGETARCH}/bin/gh" /out/usr/local/bin/gh

RUN mkdir -p /out/opt/base-toolkit/chrome-devtools-mcp \
 && npm install --prefix /out/opt/base-toolkit/chrome-devtools-mcp --omit=dev --no-audit --no-fund \
      "chrome-devtools-mcp@${CHROME_DEVTOOLS_MCP_VERSION}"

# Playwright publishes linux-arm64 Chromium builds; Google Chrome has none.
# The shared libraries it needs come from the workload image.
RUN PLAYWRIGHT_BROWSERS_PATH=/out/opt/base-toolkit/ms-playwright \
      npx --yes "playwright@${PLAYWRIGHT_VERSION}" install --no-shell chromium \
 && chrome="$(find /out/opt/base-toolkit/ms-playwright -type f -name chrome -path '*chrome-linux*' | head -n1)" \
 && test -x "$chrome" \
 && printf '%s\n' "${chrome#/out}" > /out/opt/base-toolkit/chromium-path \
 && chmod -R a+rX /out/opt/base-toolkit

COPY files/ /out/
# Claude Code always loads its managed CLAUDE.md. The agent-context capability
# only lists the same file in an index the agent reads on demand, which isn't
# enough for rules it must follow.
COPY base-toolkit-context.md /out/etc/claude-code/CLAUDE.md
RUN chmod 0644 /out/etc/claude-code/managed-settings.json /out/etc/claude-code/CLAUDE.md \
      /out/etc/gitconfig /out/etc/gitignore \
 && chmod 0755 /out/usr/local/bin/sandbox-chrome-devtools-mcp

FROM scratch
COPY --from=build /out/ /
