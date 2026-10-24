<!-- sbx-template: SANDBOX-README.md 0.3.1 -->
# Sandbox setup (sbx)

This repository can run Claude Code inside a Docker Sandboxes (sbx) microVM.
The agent works on its own clone of this repository inside the VM; your
project directory is mounted read-only, and the agent's commits come back
when you fetch them. The sandbox sees nothing else from your machine. Its
network goes through a policy that asks you before it reaches a new host, and
credentials stay on your machine: the sbx proxy adds them to requests.

The sandbox is named `scratch-editor` (from `sbxenv.yaml`). Every developer
sets it up once on their own machine, because credentials and machine
settings can't be committed. `config/sbx/bin/sbx-up` checks each step and
prints the matching section of this guide when one is missing, so keep the
section headings stable.

## Known limits

- **The Claude desktop app over SSH is for trusted work only.** It gives the
  sandbox session tools that run on your machine (your Chrome, scheduled
  tasks, session control), which the sandbox's MCP allowlist doesn't filter.
- **Claude API calls failing with `ECONNRESET`.** If every request through
  the sbx proxy starts failing, run `sbx daemon restart` and start a new
  session.
- **Some tests fail in the sandbox.** Everything else passes.
  - scratch-gui's Firefox Playwright tests in
    `test/playwright/backpack-drag-over.spec.js` ("backpack highlights when a
    block is dragged over it") and `test/playwright/drag-over-targets.spec.js`
    ("stage selector scales when a block is dragged over it", "sprite tile
    scales when a block is dragged over it"). They pass in CI.
  - scratch-svg-renderer's `test/visual-fidelity.js` pixel comparisons. They
    also fail on macOS hosts, and pass in CI.

## Quick start

1. [Set up your machine](#set-up-your-machine) (once per machine).
2. [GitHub token](#github-token) (once per sandbox).
3. Run `config/sbx/bin/sbx-up` in an interactive terminal and work through
   [your first session](#first-session).

## Set up your machine

sbx runs on macOS (Sonoma or later, Apple silicon) and Linux (Ubuntu 24.04 or
later, with KVM); see Docker's [install guide](https://docs.docker.com/ai/sandboxes/install/)
for other systems. This setup is tested on macOS.

1. Install sbx at the pinned version (0.48.0):
   - macOS: `brew trust docker/tap && brew install docker/tap/sbx`
   - Ubuntu: `curl -fsSL https://get.docker.com | sudo REPO_ONLY=1 sh`, then
     `sudo apt install docker-sbx`. Local sandboxes need KVM: add yourself to
     the `kvm` group (`sudo usermod -aG kvm "$USER"`) and sign in again.
2. Sign in: `sbx login`
3. Apply the baseline (SSH agent forwarding off, `balanced` policy):
   `config/sbx/bin/bootstrap.sh`
4. Start host Docker (Docker Desktop on macOS, Docker Engine on Linux), which
   builds the sandbox's kits. Without it, `export SBX_KIT_BUILDER=sandbox` to
   build them in sbx's builder sandbox.

Run `config/sbx/bin/bootstrap.sh --check` to see what is still missing.

## Docker volume size

This project doesn't need more than the default 10g: it runs no containers of
its own. To raise it anyway:
`sbx settings set sandbox.disk.dockerVolume <size>`. It applies to new
sandboxes only, so recreate the sandbox (`sbx env rm`), which deletes
everything inside it. To size one sandbox without changing the setting,
create it with `DOCKER_SANDBOXES_DOCKER_SIZE=<size> config/sbx/bin/sbx-up`.

## GitHub token

git and gh in the sandbox use a fine-grained personal access token that
only this sandbox can use. The sbx proxy adds it to requests; the sandbox
never sees it.

1. Open the prefilled form:
   <https://github.com/settings/personal-access-tokens/new?name=sbx-scratch-editor&description=Docker%20Sandbox%20scratch-editor%20(git%2C%20gh)&target_name=scratchfoundation&expires_in=30&contents=write&pull_requests=write>
   (or GitHub → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token).
2. Check that it says: resource owner `scratchfoundation`, expiration 30 days or
   less, permissions Contents read and write, Pull requests read and write,
   Metadata read.
3. Repository access: **Only select repositories** →
   `scratch-editor`. The link can't preselect this.
4. If `scratchfoundation` requires approval for fine-grained tokens, the token works
   once an owner of the organization approves it.
5. Store it (you're prompted for the value; never pass it on the command line):
   `sbx secret set github --sandbox scratch-editor`
6. Run `config/sbx/bin/sbx-up` again.

**Renewing.** sbx can't see when the token expires. When git or gh in the
sandbox start failing with 401 or 403, create a new token, run
`sbx secret set github --sandbox scratch-editor` again, and revoke the old one
on GitHub.

**After `sbx env rm`.** Removing the sandbox also removes its sandbox-scoped
secrets. Store the token again before the next `sbx-up`.

**Task sandboxes.** The token is stored per sandbox name, so a
[task sandbox](#one-sandbox-per-task) needs its own
`sbx secret set github --sandbox <name>`.

Instead of typing the token, you can reference it from a secret manager in a
personal `~/.sbxenv.yaml` (for 1Password, `secrets.github.ref: op://…`).

## Project credentials

This project needs no other credentials. Translation pushes (`npm run i18n:push`,
`TX_TOKEN`) run only in CI and aren't set up in the sandbox.

## First session

Run the first `config/sbx/bin/sbx-up` in an interactive terminal:

1. sbx shows the plan (sandbox with `clone: true`, kits, workspace, the
   `sandbox-scratch-editor` git remote, port 8601) and asks you to approve it
   once.
2. It asks you to bind the credentials (`anthropic`, `github`) to the
   sandbox. Approve them. A non-interactive create (`--force`) skips this
   step and the credentials aren't injected, so the first run must be
   interactive.
3. In the sandbox shell, run `claude` and `/login` with your subscription.
   The token stays on your machine; the sandbox only holds placeholders.

## Daily use

- `config/sbx/bin/sbx-up` starts the sandbox (or attaches to it) and opens a
  shell in the agent's clone; run `claude` there.
- The clone starts from the branch and commit your checkout is on when the
  sandbox is created. Uncommitted and untracked files aren't copied, and
  later commits on your machine don't appear by themselves; in the sandbox,
  `git fetch /run/sandbox/source <branch>` brings them in (your project
  directory is mounted read-only there).
- Installs and builds in the sandbox stay in the clone. Your machine's
  `node_modules` and other installed trees aren't touched.
- The scratch-gui dev server is published on port 8601. In the sandbox, run
  `npm ci && npm run build`, then start it with `npm start` and open
  <http://localhost:8601> on your machine. A server must bind `0.0.0.0`; one bound to `127.0.0.1` isn't
  reachable through the published port.
- `sbx ls` shows the sandbox; `sbx stop scratch-editor` stops it;
  `sbx env rm sbxenv.yaml` removes it, with the clone, anything you
  haven't fetched and the secrets stored for it.

## Getting the agent's work back

The agent commits in its clone. sbx serves the clone to your checkout as the
git remote `sandbox-scratch-editor`, which exists only while the sandbox runs
(`sbx exec scratch-editor true` starts it):

```bash
git fetch sandbox-scratch-editor
```

Each of its branches lands in `refs/sandboxes/scratch-editor/<branch>`, which
stays after the sandbox stops (`refs/remotes/sandbox-scratch-editor/*` is
dropped whenever sbx re-registers the remote). Review it, then make it a
branch and push it from your terminal:

```bash
git log -p develop..refs/sandboxes/scratch-editor/<branch>
git switch -c <branch> refs/sandboxes/scratch-editor/<branch>
```

## One sandbox per task

Give each task its own sandbox, so tasks run side by side without touching
each other or your checkout. Pass a name and a free host port:

```bash
config/sbx/bin/sbx-up --name scratch-editor-task-1 --port 8602
```

Use the same `--name` every time you return to it. Its remote is
`sandbox-scratch-editor-task-1`. Remove it when the work is fetched:
`sbx env rm --name scratch-editor-task-1 sbxenv.yaml`. Removing a sandbox
leaves its fetched refs behind; delete them once you've kept what you need:

```bash
git for-each-ref --format='delete %(refname)' refs/sandboxes/scratch-editor-task-1/ | git update-ref --stdin
```

## Direct mode (pairing)

`config/sbx/bin/sbx-up --direct` creates a sandbox that works on your live
project directory instead of a clone, for when you watch the session and want
its edits in your checkout at once. The mode is fixed when the sandbox is
created: `sbx-up` uses the mode of an existing sandbox and tells you how to
remove it if you asked for the other one. Use a separate `--name` to keep a
clone-mode sandbox next to it.

In direct mode `sbx-up` mounts the files that run code or change tools on
your machine read-only (see [What the sandbox protects](#what-the-sandbox-protects))
and runs the [session-end guards](#session-end-guards). Remove a direct-mode
sandbox with `sbx env rm sbxenv.yaml local.sbxenv.yaml`.

### Install on one side only

In direct mode the project directory, including `node_modules` and other
installed trees, is shared between your machine and the Linux VM. An `npm ci`
in the sandbox replaces your machine's native binaries with ones built for the
VM, which breaks the build on macOS (and on Linux when the architecture or
library versions differ), and the other way round. Pick one side for installs and
builds per checkout. The sandbox's agent is told to ask before it installs
anything.

## VS Code

VS Code connects to the sandbox over SSH (Remote-SSH extension). Set it up
once per machine:

1. Turn on sbx's SSH server, which is off by default:
   `sbx settings set feature.ssh true`, then restart the daemon:
   `sbx daemon stop && sbx daemon start -d`.
2. `sbx setup ssh` adds an `Include` block to `~/.ssh/config` (undo with
   `sbx setup ssh remove`).
3. Install the Remote-SSH extension.

Then **Connect to Host** → `scratch-editor.sbx`. This starts a stopped
sandbox. The SSH session starts in an empty home directory, so use
**Open Folder** and enter the project's path on your machine
(e.g. `/Users/<you>/git/scratch-editor` or `/home/<you>/git/scratch-editor`); the agent's clone (or, in direct mode,
your project directory) is at the same path in the VM. A task sandbox is
`<name>.sbx`.

In direct mode, a session that ends in VS Code skips `sbx-up`'s session-end
check; the next `sbx-up` runs it.

## Blocked hosts

The sandbox allows package registries, GitHub, Anthropic and what this
project's allowlist names. Any other host is blocked until you approve it:

- curl and other clients get `403 Approval required`. WebFetch only reports
  `HTTP 403 Forbidden`. The agent is told to stop and name the host.
- See what's waiting: `sbx policy approval ls`.
- Allow it for this sandbox:
  `sbx policy approval respond <approval-id> --option allow`, or drop it with
  `--option dismiss`.
- See what the sandbox reached or was refused: `sbx policy log scratch-editor`.
- Remove an approval later:
  `sbx policy rm network --sandbox scratch-editor --resource <host>:443`.

Approvals belong to the sandbox, so a recreated sandbox asks again. A host
the project needs every time belongs in the allowlist in
`config/sbx/scratch-editor/scratch-editor.yaml`; propose it in a pull request,
with a comment saying why.

Known issue:
- With Claude Code 2.1.292, a WebFetch that gets an HTTP error (including a
  blocked host) breaks the session: the next requests to Anthropic fail and
  Claude stops after a few minutes with `ECONNRESET`. Start a new session,
  and approve the host before asking Claude to fetch from it.

## What the sandbox protects

Protected:
- Your home directory, SSH keys, keychain or keyring, `~/.claude` and other projects
  aren't visible. Docker in the sandbox is its own daemon.
- Credentials (your Claude login and any token stored with `sbx secret set`)
  stay on your machine; the sandbox sees placeholders.
- Clone mode: your project directory is read-only in the sandbox, including
  `.git`. The agent's changes reach your checkout only as commits you fetch.
- Direct mode: files that run code or change tools on your machine are read-only
  in the sandbox: `.git/hooks`, `.git/config.worktree`, `.husky`, `.vscode`,
  `.claude/settings*.json`, `.mcp.json`, the hook and MCP files of Copilot
  (`.github/hooks`), Cursor and Codex, `.github/workflows`, `sbxenv.yaml`,
  `config/sbx/`. The guards report any of them that the agent creates.
- Claude runs in `auto` permission mode; bypass mode is disabled. Claude
  updates are off; the version is pinned in `sbxenv.yaml`. These are
  guardrails, not a boundary: the agent is in the VM's `docker` group, which
  makes it root in the VM, so it can remove them. The network policy and the
  credential proxy run on your machine and still apply.
- Only the MCP servers the company policy allows load: the sbx gateway, the
  in-sandbox browser and Figma.

Not protected, so review it:
- What you fetch: `package.json` scripts, `Makefile`, `.husky`, `.claude/`
  and anything else the agent committed. Read the diff before you check it
  out and run it on your machine.
- The sandbox can read your project directory, untracked files such as
  `.env` included (clone mode: at `/run/sandbox/source`).
- Direct mode: everything outside the read-only paths is writable, and
  `.git/config` is writable (for `git push -u` and similar). The guards check
  it only when a session starts or ends; before you run git on your machine
  during a session, run `config/sbx/bin/sbx-up --check`.
- Allowed hosts include large storage services (`*.amazonaws.com`,
  `*.googleapis.com`, `*.githubusercontent.com`, …), so the network policy
  can't stop a determined exfiltration. Keeping secrets out of the sandbox is
  the main protection.
- Figma traffic goes through Anthropic's MCP proxy, which the network policy
  can't scope.

## Session-end guards

In direct mode, when a session ends and again on the next start (before
anything else runs), `sbx-up` compares:
- every key in `.git/config`, `.git/config.worktree` and the files they
  include (`include.path`, `includeIf.*.path`, whether or not the condition
  holds now) against a snapshot kept outside the project. Only upstream
  tracking (`branch.*` with a remote name), `remote.*.fetch` and the
  `sandbox-<name>` remotes sbx manages are left out; every other key could
  make git on your machine run code or reach another host;
- the read-only paths, by hash, including ones that didn't exist before.

If something changed it prints the old and new values and exits 1. Nothing is
reverted. Review it (`git config --file .git/<file> --unset-all <key>` removes
a key; an included file is shown by its path from the project root, so use
`--file <path>`), then accept the current state with `config/sbx/bin/sbx-up --accept`.
Editing `config/sbx/` or `sbxenv.yaml` on your machine also shows up
here; accept it the same way.

`config/sbx/bin/sbx-up --check` runs the checks without starting anything.

## Figma (optional)

Connect Figma under claude.ai → Settings → Connectors. After the next
`claude` start in the sandbox, its tools are available as `claude.ai Figma`.
The Figma login stays on claude.ai; no Figma token is in the sandbox. Other
claude.ai connectors are blocked in the sandbox.

## Checking the sandbox

`config/sbx/bin/acceptance.sh` checks the sandbox from your machine: isolation,
credentials, the network policy, ports and the browser, plus the clone
(clone mode) or the read-only paths and guards (direct mode). Add
`--name <name>` for a task sandbox, `--claude` for the checks that run
Claude, and see `--help` for the other options and what each check covers.
It restores everything it changes.

In this repository the clone check fails: the commitlint hook rejects the
test commit it makes in the VM. A commit with a Conventional Commits message
comes back with `git fetch sandbox-scratch-editor` as expected.
