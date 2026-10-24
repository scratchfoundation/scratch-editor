# Working in an sbx sandbox

You run inside a Docker Sandboxes (sbx) microVM. Nothing from the
developer's machine is here except the project. It comes in one of two modes;
`/run/sandbox/source` exists only in clone mode.

- **Clone mode.** You work on a private clone of the repository. The
  developer's checkout is mounted read-only at `/run/sandbox/source`; their
  later commits arrive with `git fetch /run/sandbox/source <branch>`. Your
  work reaches them only as commits, which they fetch from this sandbox, so
  commit it on a branch before you finish. Uncommitted changes stay here.
  Installs and builds in the clone don't affect their machine.
- **Direct mode.** The project directory is shared live with the developer's
  machine; the read-only files, `.git/config` and native-dependency rules
  below apply.

- **Blocked hosts.** The sandbox's network policy stops requests to hosts it
  doesn't allow. curl and other clients see 403 "Approval required"; WebFetch
  only reports a bare "HTTP 403 Forbidden". Treat any 403 from a host you
  haven't reached before in this session as a policy block. Stop and tell the
  user which host you need and why. Don't work around it through mirrors,
  proxies, caches or other hosts. The user approves it on their machine, or
  adds it to the project's allowlist.
- **Web research.** Use WebSearch first, then WebFetch on the best result.
  Each new host WebFetch reaches may need the user's approval.
- **Read-only files are intentional** (direct mode). Git hooks, editor and agent settings,
  `.mcp.json`, CI workflows and the sandbox definition (`sbxenv.yaml`,
  `config/sbx/`) are mounted read-only. Don't try to change, rename or
  recreate them; ask the user to make the change on their machine.
- **Changes to `.git/config` are reported** (direct mode). Upstream tracking (`git push -u`)
  is fine. Don't set hooks, aliases, editors, pagers, filters, credential
  helpers or remote URLs there; the developer's next host session flags them.
- **Published ports.** The ports listed under `ports:` in the project's
  `sbxenv.yaml` are published to the developer's machine when the sandbox is
  created, on the same port numbers unless the developer chose others (clone
  mode: if the clone has no `sbxenv.yaml`, read it at `/run/sandbox/source`).
  Treat them as already published: the developer's browser, and any browser
  on their machine such as the Claude desktop app's Browser pane, reaches them
  at `http://localhost:<port>`. Don't tell the developer to publish them
  again. A port missing from that list needs `sbx ports <sandbox> --publish
  <port>` on their machine. Either way a server is only reachable from the
  host if it binds `0.0.0.0`, not `127.0.0.1` or `localhost`. Most dev
  servers take a host flag for this (`--host 0.0.0.0`, `-a 0.0.0.0:<port>`,
  …).
- **Native dependencies** (direct mode). The project directory is shared with the
  developer's machine (often macOS), so `node_modules`, virtualenvs and other
  installed trees are shared too.
  Don't run `npm install`/`npm ci` (or similar) on a tree the host installed:
  Linux binaries would replace the host's and break its build. Ask first.
- **Browser.** The `chrome-devtools` MCP server drives a headless Chromium
  inside this sandbox. Use it for pages served here, e.g.
  `http://localhost:<port>`. A browser on the developer's machine reaches
  the same pages through the published ports above.
- **GitHub.** When the project sets one up, `git` and `gh` authenticate
  through the sandbox proxy with a token scoped to this repository.
  `GH_TOKEN` holds a placeholder, not the real token; don't print or copy it.
  Other repositories are expected to fail.
- **MCP servers.** Only the servers the company policy allows load here. A
  server from the project's `.mcp.json` that is missing was blocked on
  purpose.
