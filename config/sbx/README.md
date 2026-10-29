<!-- sbx-template: SANDBOX-README.md 0.4.0 -->
# Sandbox (sbx)

You can run Claude Code in a sandbox: a small VM with its own copy of this
repository. The agent works on that copy, so it can't change your checkout,
and it can't reach your credentials or anything else on your machine. When
you're ready, you take its work out with git.

This page covers day-to-day use. The [reference](REFERENCE.md) has the rest:
setup details, parallel task sandboxes, VS Code, pairing mode and what
exactly the sandbox protects.

## Start

In the project directory, run:

```bash
config/sbx/bin/sbx-up
```

The first time, it checks your machine and stops at the first missing step
(installing sbx, signing in, the GitHub token) with instructions. Do that step
and run it again. Once everything is in place, sbx asks you to approve the
sandbox and its credentials; approve both.

You land in a shell inside the sandbox. Run `claude` there (the first time,
`/login` with your subscription).

Next time, the same command takes you back in. The sandbox stays until you
remove it, so work can span days: `sbx stop scratch-editor` stops it, and the agent's
copy and its commits are still there when you start it again.

## Getting your work out

The agent commits on its copy. To bring its commits to your checkout, run
this on your machine while the sandbox is running (`sbx exec scratch-editor true`
starts it without opening a shell):

```bash
git fetch sandbox-scratch-editor
```

Its branches land under `refs/sandboxes/scratch-editor/`. Look at the changes, then
turn the branch into a normal one and push it, or let the
agent push from the sandbox:

```bash
git log -p develop..refs/sandboxes/scratch-editor/<branch>
git switch -c <branch> refs/sandboxes/scratch-editor/<branch>
```

Read the diff before you run anything from it on your machine
(`package.json` scripts, git hooks, `.claude/` files): that code runs
outside the sandbox.

Fetch often: what you've fetched stays on your machine, while
`sbx env rm sbxenv.yaml` removes the sandbox with everything you haven't
fetched and the GitHub token stored for it.

## When a site is blocked

The sandbox reaches package registries, GitHub, Anthropic and the hosts this
project needs. Any other site waits for your approval, and the agent tells
you which one. On your machine:

```bash
sbx policy approval ls
sbx policy approval respond <approval-id> --option allow
```

## Good to know

- The scratch-gui dev server runs on port 8601: start it in the sandbox with
  `npm ci && npm run build && npm start` and open <http://localhost:8601>.
- The sandbox's copy doesn't follow your checkout. It starts from the commit
  you're on when the sandbox is created, without uncommitted files. To bring
  in newer commits, run `git fetch /run/sandbox/source <branch>` in the
  sandbox.
- Installs and builds in the sandbox stay there; your machine's
  `node_modules` and other installed trees aren't touched.
- If Claude keeps failing with `ECONNRESET`, run `sbx daemon restart` on
  your machine and start a new session. Approve a blocked site before you ask
  Claude to fetch from it: a failed fetch can cause this.
- Only some MCP servers work in the sandbox (Figma does, through the
  claude.ai connector); see [MCP servers](REFERENCE.md#mcp-servers).
- To run several tasks side by side, give each its own sandbox:
  [one sandbox per task](REFERENCE.md#one-sandbox-per-task).
- `config/sbx/bin/acceptance.sh` checks that the sandbox works as intended.
