#!/usr/bin/env bash
# sbx-template: acceptance.sh 0.3.0
#
# Acceptance checks for a project's sbx sandbox, run from the host.
#
#   config/sbx/bin/acceptance.sh [options]
#
#   --project DIR            project root with sbxenv.yaml (default: current directory)
#   --name NAME              sandbox name (default: name: in sbxenv.yaml)
#   --only CHECK,...         run only these checks (names below)
#   --claude                 also run the checks that drive Claude in the VM
#                            (session, web, and ports through chrome-devtools
#                            MCP); needs /login done and uses your subscription
#   --repo OWNER/NAME        github, token-scope: a test repo the sandbox's
#                            github secret is scoped to; github pushes a branch
#                            there and opens and closes a draft PR
#   --other-repo OWNER/NAME  token-scope: a private repo outside the token's
#                            scope (default: the project's origin)
#   --destructive            remove: remove the sandbox and its sandbox-scoped
#                            secrets at the end
#
# Checks, in the order they run:
#   setup        Claude matches the mixin pin; managed settings and CLAUDE.md;
#                git rewrites git@github.com: to HTTPS; tools installed
#   clone        clone mode: files made in the VM stay there; a commit made in
#                the VM reaches the host with git fetch sandbox-NAME
#   isolation    only the project from the host home, no SSH keys or agent, a
#                private Docker daemon
#   credentials  the environment and ~/.claude/.credentials.json hold
#                placeholders only
#   session      (--claude) auto mode, mcp-gateway and chrome-devtools loaded
#   web          (--claude) WebSearch and WebFetch work; a blocked host raises
#                a pending approval
#   policy       example.org is blocked, works once allowed, and is blocked
#                again once the rule is removed
#   registries   the package registries of the workload's clients are reachable
#   github       (--repo) clone, push and a draft PR work through the scoped
#                token; the host's origin is unchanged
#   token-scope  (--repo, --other-repo) the token is refused outside its scope
#   ports        the published port reaches a server in the VM; headless
#                Chromium screenshots it; with --claude, the chrome-devtools
#                MCP takes a screenshot and reads the console
#   readonly     direct mode: read-only paths deny writes, and their parent
#                directories can't be renamed
#   git-config   direct mode: sbx-up --check reports .git/config edits made in
#                the VM
#   remove       (--destructive) removing the sandbox also removes its
#                sandbox-scoped secrets
#
# Needs a created sandbox (config/sbx/bin/sbx-up --create); `sbx exec` starts
# it if it is stopped. The published port must be free in the VM. The mode
# comes from the sandbox's mounts (sandbox_field in sbx-lib.sh).
#
# What it changes and puts back: policy allows example.org for the sandbox,
# then removes the rule; clone commits on a throwaway branch in the VM,
# fetches it on the host, then deletes the branch and the fetched refs;
# readonly renames protected parent directories only if the mount allows it,
# and renames them back at once; git-config edits .git/config (and
# .git/config.worktree) from the VM, adds a file under .git that it includes,
# and restores them from host-side copies.
# Each change is undone on exit, also after a failure or Ctrl-C. Secret
# values are never printed: credential checks compare inside the VM and print
# only the result.
set -euo pipefail

root="$(pwd -P)"
name=""
only=""
with_claude=false
repo=""
other_repo=""
destructive=false
while [ $# -gt 0 ]; do
  case "$1" in
    --project) root="$(cd "$2" && pwd -P)"; shift ;;
    --name) name="$2"; shift ;;
    --only) only=",$(printf '%s' "$2" | tr '[:upper:]' '[:lower:]'),"; shift ;;
    --claude) with_claude=true ;;
    --repo) repo="$2"; shift ;;
    --other-repo) other_repo="$2"; shift ;;
    --destructive) destructive=true ;;
    -h|--help) awk 'NR > 1 && !/^#/ { exit } NR > 1' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1 (see --help)" >&2; exit 2 ;;
  esac
  shift
done

# shellcheck source-path=SCRIPTDIR source=sbx-lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/sbx-lib.sh"

check_ids="setup clone isolation credentials session web policy registries github token-scope ports readonly git-config remove"
for id in $(printf '%s' "$only" | tr ',' ' '); do
  case " $check_ids " in *" $id "*) ;; *) echo "unknown check '$id' in --only (known: $check_ids)" >&2; exit 2 ;; esac
done

env_file="$root/sbxenv.yaml"
local_env_file="$root/local.sbxenv.yaml"
sbx_up="$root/config/sbx/bin/sbx-up"
[ -f "$env_file" ] || { echo "no sbxenv.yaml in $root (use --project)" >&2; exit 2; }
[ -x "$sbx_up" ] || { echo "no $sbx_up" >&2; exit 2; }

default_name="$(env_name "$env_file")"
[ -n "$name" ] || name="$default_name"
name_args=()
[ "$name" = "$default_name" ] || name_args=(--name "$name")
claude_pin="$(sed -n 's/.*sbx-kit-claude-mixin:\([0-9][0-9.]*\).*/\1/p' "$env_file" | head -n1)"
sandbox_port="$(sed -n 's/^[[:space:]]*-[[:space:]]*sandbox:[[:space:]]*\([0-9]*\).*/\1/p' "$env_file" | head -n1)"
host_port=""  # read from sbx once the sandbox runs
origin_repo="$(git -C "$root" remote get-url origin 2>/dev/null \
  | sed -E 's#^(git@github\.com:|ssh://git@github\.com/|https://github\.com/)##; s#\.git$##')" || origin_repo=""
[ -n "$other_repo" ] || other_repo="$origin_repo"

work="$(mktemp -d "${TMPDIR:-/tmp}/sbx-acceptance.XXXXXX")"
log="$work/sbx.log"

# --- cleanup ------------------------------------------------------------------
# Each check that changes something records it here before it does; the exit
# trap undoes whatever is still recorded, so a failure or Ctrl-C leaves
# nothing behind.
policy_rule=false        # example.org allowed for the sandbox
clone_branch=""          # throwaway branch in the VM clone, fetched on the host
ports_server=false       # test web server in the VM
git_config_backup=false  # .git/config (and config.worktree) edited from the VM
cleanup() {
  if [ "$policy_rule" = true ] && ! sbx policy rm network --sandbox "$name" --resource example.org:443 --force >/dev/null 2>>"$log"; then
    echo "  ! example.org is still allowed; remove it with: sbx policy rm network --sandbox $name --resource example.org:443" >&2
  fi
  cleanup_clone
  if [ "$ports_server" = true ]; then
    vm <<'EOF' >/dev/null || true
kill "$(cat /tmp/sbx-acceptance-www.pid 2>/dev/null)" 2>/dev/null; rm -rf /tmp/sbx-acceptance-www* /tmp/sbx-acceptance.png
EOF
  fi
  cleanup_git_config
  policy_rule=false ports_server=false
  # The log helps when something failed; the .git/config copies may hold
  # credentials in remote URLs, so they never stay (cleanup_git_config
  # removes them).
  if [ "${failed:-0}" = 0 ]; then rm -rf "$work"; else echo "sbx output kept in $log"; fi
}
trap cleanup EXIT

# --- output -------------------------------------------------------------------
passed=0 failed=0 skipped=0
ok()   { printf '  \033[32m✓\033[0m %-11s %s\n' "$1" "$2"; passed=$((passed + 1)); }
bad()  { printf '  \033[31m✗\033[0m %-11s %s\n' "$1" "$2"; failed=$((failed + 1)); }
skip() { printf '  \033[33m-\033[0m %-11s %s\n' "$1" "$2"; skipped=$((skipped + 1)); }

wanted() { [ -z "$only" ] || case "$only" in *",$1,"*) return 0 ;; *) return 1 ;; esac; }

# Turn "R pass|fail|skip <text>" lines from a VM script into results.
collect() {
  local id="$1" line
  while IFS= read -r line; do
    case "$line" in
      "R pass "*) ok "$id" "${line#R pass }" ;;
      "R fail "*) bad "$id" "${line#R fail }" ;;
      "R skip "*) skip "$id" "${line#R skip }" ;;
    esac
  done
}

# Run the bash script on stdin in the sandbox, from the workspace, in a login
# shell. Arguments before the script are `sbx exec` flags (e.g. -e K=V).
vm() {
  { echo 'r() { echo "R $*"; }'; cat; } | sbx exec -i "$@" "$name" bash -l -s 2>>"$log"
}

# Code of an HTTPS request from the VM; 403 means the policy blocked it.
vm_http_code() {
  vm -e URL="$1" <<'EOF' || true
curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$URL"
EOF
}

pending_approval() {
  sbx policy approval ls 2>/dev/null | awk -v s="$name" -v h="$1" '$2 == s && $3 == h { print $1; exit }'
}

wait_for_approval() {
  local id="" _
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    id="$(pending_approval "$1")"
    [ -n "$id" ] && break
    sleep 1
  done
  printf '%s' "$id"
}

sbx_up_check() { "$sbx_up" --check --skip-secrets ${name_args[@]+"${name_args[@]}"}; }
guards_clean() { sbx_up_check >/dev/null 2>&1; }

# --- Claude helpers -----------------------------------------------------------
# Run a headless Claude prompt in the VM, capped at 90 s (API retries can
# otherwise run for minutes); the stream goes to a host file.
claude_run() {
  local out="$1" prompt="$2"
  vm -e PROMPT="$prompt" > "$out" <<'EOF' || true
timeout 90 claude -p "$PROMPT" --output-format stream-json --verbose 2>/dev/null
EOF
}

# Summarise a stream: MODE, MCP <name> <status>, TOOL <name>, TOOLERR, FINAL.
claude_summary() {
  python3 -I - "$1" <<'EOF'
import json, sys
for line in open(sys.argv[1], errors="replace"):
    try:
        e = json.loads(line)
    except ValueError:
        continue
    t = e.get("type")
    if t == "system" and e.get("subtype") == "init":
        print("MODE", e.get("permissionMode"))
        for s in e.get("mcp_servers", []):
            print("MCP", s.get("name", "").replace(" ", "_"), s.get("status"))
    elif t == "assistant":
        for c in e["message"].get("content", []):
            if c.get("type") == "tool_use":
                print("TOOL", c.get("name"))
    elif t == "user":
        for c in e["message"].get("content", []):
            if isinstance(c, dict) and c.get("type") == "tool_result" and c.get("is_error"):
                print("TOOLERR", str(c.get("content"))[:200].replace("\n", " "))
    elif t == "result":
        print("FINAL", (e.get("result") or "").replace("\n", " ")[:400])
EOF
}

# --- checks -------------------------------------------------------------------
check_setup() {
  vm -e PIN="$claude_pin" > "$work/out" <<'EOF' || true
v="$(claude --version 2>/dev/null | awk '{print $1}')"
if [ -z "$PIN" ]; then r fail "no sbx-kit-claude-mixin:<version> pin found in sbxenv.yaml"
elif [ "$v" = "$PIN" ]; then r pass "claude $v matches the mixin pin"
else r fail "claude is '$v', the mixin pin is '$PIN'"; fi
f=/etc/claude-code/managed-settings.json
[ "$(stat -c '%U %a' "$f" 2>/dev/null)" = "root 644" ] && r pass "$f is root-owned, 0644" || r fail "$f missing or not root 0644"
python3 -I - "$f" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception as e:
    print("R fail cannot read managed settings:", e); sys.exit()
want = [
    (d.get("permissions", {}).get("defaultMode") == "auto", "defaultMode auto"),
    (d.get("permissions", {}).get("disableBypassPermissionsMode") == "disable", "bypass mode disabled"),
    (d.get("env", {}).get("DISABLE_UPDATES") == "1", "updates disabled"),
    (d.get("env", {}).get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC") == "1", "telemetry off"),
    (d.get("allowManagedMcpServersOnly") is True, "MCP allowlist locked"),
]
for good, what in want:
    print("R pass" if good else "R fail", "managed settings:", what)
PY
claude update 2>&1 | grep -qi "disabled" && r pass "claude update is refused" || r fail "claude update is not refused"
[ -s /etc/claude-code/CLAUDE.md ] && r pass "managed CLAUDE.md present" || r fail "/etc/claude-code/CLAUDE.md missing"
grep -q "already published" /etc/claude-code/CLAUDE.md 2>/dev/null \
  && r pass "managed CLAUDE.md says sbxenv.yaml ports are published" || r fail "managed CLAUDE.md lacks the published-ports guidance"
git config --get-all url.https://github.com/.insteadof | grep -qx 'git@github.com:' \
  && r pass "git rewrites git@github.com: to HTTPS" || r fail "no git@github.com: → HTTPS rewrite"
[ -z "$(git config --file .git/config --get-regexp '^url\.' 2>/dev/null)" ] \
  && r pass "the rewrite is not in the shared .git/config" || r fail "url.* rewrite found in .git/config"
x="$(git config --global core.excludesFile)"; x="${x/#\~/$HOME}"
grep -qx '.claude/settings.local.json' "$x" 2>/dev/null \
  && r pass "global ignore includes the company entries" || r fail "global ignore lacks .claude/settings.local.json"
for c in gh sandbox-chrome-devtools-mcp docker; do
  command -v "$c" >/dev/null && r pass "$c installed" || r fail "$c missing"
done
EOF
  collect setup < "$work/out"
}

check_clone() {
  if [ "$mode" != clone ]; then skip clone "clone mode only"; return; fi
  vm -e PROJECT="$root" > "$work/out" <<'EOF' || true
src=/run/sandbox/source
if [ ! -d "$src" ]; then r fail "no $src (is this a clone-mode sandbox?)"; exit 0; fi
if findmnt -n -o OPTIONS "$src" 2>/dev/null | grep -qE '(^|,)ro(,|$)'; then r pass "project directory mounted read-only at $src"
else r fail "$src is not a read-only mount"; fi
for t in "$src/.sbx-acceptance-probe" "$src/.git/config" "$src/sbxenv.yaml"; do
  if ( : >> "$t" ) 2>/dev/null; then r fail "$t is writable"; else r pass "write to ${t#$src/} in the host project denied"; fi
done
rm -f "$src/.sbx-acceptance-probe" 2>/dev/null
fs="$(findmnt -n -o FSTYPE -T "$PROJECT" 2>/dev/null)"
[ "$(git rev-parse --show-toplevel 2>/dev/null)" = "$PROJECT" ] && [ -n "$fs" ] && [ "$fs" != virtiofs ] \
  && r pass "workspace is a VM-local clone at the host path ($fs)" || r fail "workspace is not a VM-local clone (fs: $fs)"
: > .sbx-acceptance-clone-probe && echo created
EOF
  collect clone < "$work/out"
  if grep -qx created "$work/out"; then
    [ -e "$root/.sbx-acceptance-clone-probe" ] && bad clone "a file created in the clone appears on the host" \
      || ok clone "a file created in the clone stays in the VM"
  fi
  local b sha fetched=""
  b="sbx-acceptance-$(date +%s)"
  clone_branch="$b"
  vm -e B="$b" > "$work/out" <<'EOF' || true
rm -f .sbx-acceptance-clone-probe
cur="$(git symbolic-ref -q --short HEAD || git rev-parse HEAD)"
git switch -q -c "$B" && git commit -q --allow-empty -m "sbx acceptance check" && git rev-parse HEAD
git checkout -q "$cur"
EOF
  sha="$(tail -n1 "$work/out")"
  if [ -z "$sha" ]; then bad clone "could not commit in the VM"; return; fi
  if git -C "$root" fetch -q "sandbox-$name" "refs/heads/$b" 2>>"$log"; then
    fetched="$(git -C "$root" rev-parse FETCH_HEAD 2>/dev/null)"
  fi
  [ "$fetched" = "$sha" ] && ok clone "a commit made in the VM arrives with git fetch sandbox-$name" \
    || bad clone "git fetch sandbox-$name did not bring the VM's commit"
  cleanup_clone
}

cleanup_clone() {
  [ -n "$clone_branch" ] || return 0
  vm -e B="$clone_branch" >/dev/null <<'EOF' || true
git branch -q -D "$B"
EOF
  git -C "$root" update-ref -d "refs/remotes/sandbox-$name/$clone_branch" 2>/dev/null || true
  git -C "$root" update-ref -d "refs/sandboxes/$name/$clone_branch" 2>/dev/null || true
  clone_branch=""
}

check_isolation() {
  local host_docker_id
  host_docker_id="$(docker info --format '{{.ID}}' 2>/dev/null || true)"
  vm -e PROJECT="$root" -e HOST_HOME="$HOME" -e HOST_DOCKER_ID="$host_docker_id" > "$work/out" <<'EOF' || true
[ "$PWD" = "$PROJECT" ] && r pass "workspace mounted at the host path" || r fail "workspace is $PWD, expected $PROJECT"
extra=""
for e in "$HOST_HOME"/* "$HOST_HOME"/.[!.]*; do
  [ -e "$e" ] || continue
  case "$PROJECT/" in "$e/"*) ;; *) extra="$extra ${e#$HOST_HOME/}" ;; esac
done
[ -z "$extra" ] && r pass "nothing from the host home except the project path" || r fail "visible in the host home:$extra"
ls "$HOME"/.ssh/id_* >/dev/null 2>&1 && r fail "SSH keys in the VM home" || r pass "no SSH keys in the VM"
ssh-add -l >/dev/null 2>&1; rc=$?
[ "$rc" = 2 ] && r pass "no SSH agent reachable" || r fail "an SSH agent answers (ssh-add -l exit $rc)"
id="$(docker info --format '{{.ID}}' 2>/dev/null)"
if [ -z "$id" ]; then r fail "no Docker daemon in the VM"
elif [ -n "$HOST_DOCKER_ID" ] && [ "$id" = "$HOST_DOCKER_ID" ]; then r fail "the VM talks to the host's Docker daemon"
else r pass "private Docker daemon"; fi
EOF
  collect isolation < "$work/out"
}

check_credentials() {
  vm > "$work/out" <<'EOF' || true
python3 -I - <<'PY'
import json, os, re
real = re.compile(r"^(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-|xox[abprs]-|AKIA|ASIA|sk-)")
leaks = sorted(k for k, v in os.environ.items() if real.match(v) and "proxy" not in v)
if leaks:
    print("R fail real-looking credential values in:", ", ".join(leaks))
else:
    print("R pass environment holds placeholders only")
if "GH_TOKEN" in os.environ:
    print("R pass GH_TOKEN is set (placeholder)" if not real.match(os.environ["GH_TOKEN"]) else "R fail GH_TOKEN looks real")
p = os.path.expanduser("~/.claude/.credentials.json")
if not os.path.exists(p):
    print("R skip no ~/.claude/.credentials.json (run /login first)")
else:
    found, looks_real = [], []
    def walk(o, path):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, path + "." + k)
        elif isinstance(o, str):
            if real.match(o) and "proxy" not in o:
                looks_real.append(path)
            if re.search("token|key|secret", path, re.I):
                found.append((path, o.endswith("proxy-managed")))
    try:
        walk(json.load(open(p)), "")
    except ValueError as e:
        print("R fail cannot parse ~/.claude/.credentials.json:", e)
    bad = sorted(set([k for k, sentinel in found if not sentinel] + looks_real))
    if bad:
        print("R fail credentials.json holds non-sentinel values at:", ", ".join(bad))
    elif not found:
        print("R fail credentials.json has no token fields to check (unknown format)")
    else:
        print("R pass credentials.json holds %d proxy-managed sentinel(s) only" % len(found))
PY
EOF
  collect credentials < "$work/out"
}

check_policy() {
  local code id
  code="$(vm_http_code https://example.org)"
  if [ "$code" != 403 ]; then
    bad policy "example.org returned $code before approval, expected 403 (already allowed?)"
    return
  fi
  ok policy "example.org blocked (403)"
  id="$(wait_for_approval example.org:443)"
  if [ -z "$id" ]; then bad policy "no pending approval for example.org:443"; return; fi
  ok policy "pending approval created"
  policy_rule=true
  sbx policy approval respond "$id" --option allow >/dev/null 2>>"$log"
  code="$(vm_http_code https://example.org)"
  [ "$code" = 200 ] && ok policy "after allow: 200" || bad policy "after allow: $code"
  if sbx policy rm network --sandbox "$name" --resource example.org:443 --force >/dev/null 2>>"$log"; then
    policy_rule=false
  else
    bad policy "could not remove the example.org rule (retried on exit)"
  fi
  code="$(vm_http_code https://example.org)"
  [ "$code" = 403 ] && ok policy "after removing the rule: 403 again" || bad policy "after removing the rule: $code"
  id="$(pending_approval example.org:443)"
  [ -z "$id" ] || sbx policy approval respond "$id" --option dismiss >/dev/null 2>>"$log" || true
}

check_registries() {
  vm > "$work/out" <<'EOF' || true
# Only the registries whose client the workload has.
if command -v npm >/dev/null; then
  npm view react version >/dev/null 2>&1 && r pass "npm registry reachable" || r fail "npm view react version failed"
else r skip "no npm in the workload"; fi
if python3 -m pip --version >/dev/null 2>&1; then
  python3 -m pip index versions requests >/dev/null 2>&1 && r pass "PyPI reachable" || r fail "pip index versions requests failed"
else r skip "no pip in the workload"; fi
if command -v go >/dev/null; then
  (cd /tmp && go list -m -versions golang.org/x/text) >/dev/null 2>&1 && r pass "Go module proxy reachable" || r fail "go list -m golang.org/x/text failed"
fi
EOF
  collect registries < "$work/out"
}

check_github() {
  if [ -z "$repo" ]; then
    skip github "git push and draft PR (needs --repo OWNER/NAME with a scoped github secret)"
    return
  fi
  local origin_before
  origin_before="$(git -C "$root" remote get-url origin 2>/dev/null || true)"
  vm -e REPO="$repo" > "$work/out" <<'EOF' || true
d="$(mktemp -d)"; b="sbx-acceptance-$(date +%s)"
cd "$d"
if ! git clone -q --depth 1 "git@github.com:$REPO.git" repo 2>/dev/null; then
  r fail "clone of $REPO over the rewritten SSH URL failed"; exit 0
fi
r pass "clone of git@github.com:$REPO (rewritten to HTTPS)"
cd repo
git switch -q -c "$b" && git commit -q --allow-empty -m "sbx acceptance check"
if git push -q -u origin "$b" 2>/dev/null; then
  r pass "git push -u"
  [ "$(git config "branch.$b.remote")" = origin ] && r pass "upstream tracking written" || r fail "no upstream tracking"
  url="$(gh pr create --repo "$REPO" --head "$b" --draft --title "sbx acceptance check" --body "Opened and closed by config/sbx/bin/acceptance.sh." 2>/dev/null)"
  if [ -n "$url" ]; then
    r pass "gh pr create --draft"
    gh pr close "$url" --repo "$REPO" --delete-branch >/dev/null 2>&1 && r pass "draft PR closed, branch deleted" || r fail "could not close $url"
  else
    r fail "gh pr create failed"
    git push -q origin --delete "$b" 2>/dev/null || true
  fi
else
  r fail "git push -u failed"
fi
cd /; rm -rf "$d"
EOF
  collect github < "$work/out"
  [ "$(git -C "$root" remote get-url origin 2>/dev/null || true)" = "$origin_before" ] \
    && ok github "host origin unchanged" || bad github "host origin changed"
}

check_token_scope() {
  if [ -z "$repo" ]; then skip token-scope "needs --repo (the token's scope)"; return; fi
  if [ -z "$other_repo" ] || [ "$other_repo" = "$repo" ]; then skip token-scope "needs --other-repo outside the token's scope"; return; fi
  case "$other_repo" in
    */*/*|*:*) skip token-scope "'$other_repo' is not a GitHub OWNER/NAME (pass --other-repo)"; return ;;
  esac
  # A refusal only counts if the repository exists and the token works for
  # the one it is scoped to; otherwise any network error would pass.
  if command -v gh >/dev/null && ! gh api "repos/$other_repo" --silent 2>>"$log"; then
    skip token-scope "can't confirm $other_repo exists with your host gh; check --other-repo"
    return
  fi
  vm -e REPO="$repo" -e OTHER="$other_repo" > "$work/out" <<'EOF' || true
if ! git ls-remote "https://github.com/$REPO.git" >/dev/null 2>&1 || ! gh api "repos/$REPO" --silent 2>/dev/null; then
  r fail "the token can't read $REPO either, so a refusal for $OTHER proves nothing"; exit 0
fi
git ls-remote "https://github.com/$OTHER.git" >/dev/null 2>&1 && r fail "git can read $OTHER" || r pass "git ls-remote $OTHER refused"
if err="$(gh api "repos/$OTHER" --silent 2>&1)"; then r fail "gh api can read $OTHER"
else case "$err" in
  *"HTTP 404"*|*"HTTP 403"*) r pass "gh api repos/$OTHER refused" ;;
  *) r fail "gh api repos/$OTHER failed for another reason: $(printf '%s' "$err" | head -n1 | cut -c1-120)" ;;
esac; fi
EOF
  collect token-scope < "$work/out"
}

check_ports() {
  if [ -z "$sandbox_port" ]; then skip ports "sbxenv.yaml publishes no port"; return; fi
  host_port="$(sandbox_field "$name" port "$sandbox_port")" || host_port=""
  if [ -z "$host_port" ]; then bad ports "sbx publishes no host port for sandbox port $sandbox_port"; return; fi
  local body
  ports_server=true
  vm -e PORT="$sandbox_port" > "$work/out" <<'EOF' || true
d=/tmp/sbx-acceptance-www; mkdir -p "$d"
printf '<!doctype html><title>sbx acceptance</title><h1>sbx acceptance</h1><script>console.log("sbx-acceptance-console")</script>\n' > "$d/index.html"
nohup setsid python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$d" >/tmp/sbx-acceptance-www.log 2>&1 &
echo $! > /tmp/sbx-acceptance-www.pid
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 0.5; done
curl -s "http://localhost:$PORT/" | grep -q 'sbx acceptance' && r pass "test server on 0.0.0.0:$PORT" || r fail "test server did not start on $PORT"
EOF
  collect ports < "$work/out"
  body="$(curl -s --max-time 10 "http://127.0.0.1:$host_port/" || true)"
  case "$body" in
    *"sbx acceptance"*) ok ports "published port: host 127.0.0.1:$host_port reaches it" ;;
    *) bad ports "host 127.0.0.1:$host_port does not reach the VM server" ;;
  esac
  vm -e PORT="$sandbox_port" > "$work/out" <<'EOF' || true
p="$(cat /opt/base-toolkit/chromium-path 2>/dev/null)"
if [ -z "$p" ]; then r skip "no /opt/base-toolkit/chromium-path"; exit 0; fi
rm -f /tmp/sbx-acceptance.png
# The dead proxy keeps Chromium's own background requests (Google accounts,
# component updates) from reaching the policy; loopback bypasses proxies.
"$p" --headless --disable-gpu --no-first-run --proxy-server=http://127.0.0.1:9 --window-size=800,600 --screenshot=/tmp/sbx-acceptance.png "http://localhost:$PORT/" >/dev/null 2>&1
[ -s /tmp/sbx-acceptance.png ] && r pass "headless Chromium screenshot" || r fail "headless Chromium produced no screenshot"
EOF
  collect ports < "$work/out"
  if [ "$with_claude" = true ]; then
    claude_run "$work/ports.jsonl" "Use the chrome-devtools MCP server: open http://localhost:$sandbox_port/, take a screenshot, then list the console messages. Reply with exactly CONSOLE_OK if a console message contains sbx-acceptance-console, otherwise CONSOLE_MISSING."
    local s; s="$(claude_summary "$work/ports.jsonl")"
    grep -q '^TOOL mcp__chrome-devtools__take_screenshot' <<< "$s" && ok ports "MCP screenshot" || bad ports "MCP took no screenshot"
    grep -q '^FINAL.*CONSOLE_OK' <<< "$s" && ok ports "MCP console message seen" || bad ports "MCP console check: $(grep '^FINAL' <<< "$s" | cut -c7-120)"
    # The launcher's flags keep Chromium's own Google requests from becoming
    # approval prompts.
    local stray
    stray="$(sbx policy approval ls 2>/dev/null | awk -v s="$name" '$2 == s && $3 ~ /google/ { print $3 }' | tr '\n' ' ')"
    [ -z "$stray" ] && ok ports "no pending approvals from Chromium's background requests" \
      || bad ports "Chromium left pending approvals: $stray"
  else
    skip ports "chrome-devtools MCP (needs --claude)"
  fi
  vm <<'EOF' >/dev/null || true
kill "$(cat /tmp/sbx-acceptance-www.pid 2>/dev/null)" 2>/dev/null; rm -rf /tmp/sbx-acceptance-www* /tmp/sbx-acceptance.png
EOF
  ports_server=false
}

check_readonly() {
  if [ "$mode" != direct ]; then skip readonly "direct mode only (clone mode mounts the whole project read-only; see the clone check)"; return; fi
  local ro
  ro="$(sed -n 's#^[[:space:]]*-[[:space:]]*path:[[:space:]]*\./##p' "$local_env_file" 2>/dev/null | tr '\n' ' ')"
  if [ -z "$ro" ]; then bad readonly "no read-only paths in local.sbxenv.yaml (start the sandbox with sbx-up)"; return; fi
  vm -e RO="$ro sbxenv.yaml" > "$work/out" <<'EOF' || true
tops="" t=""
# Undo a rename this script made if it is killed halfway.
trap '[ -n "$t" ] && [ -e "$t.sbx-acceptance" ] && [ ! -e "$t" ] && mv -T "$t.sbx-acceptance" "$t"' EXIT
for p in $RO; do
  if [ -d "$p" ]; then
    if ( : > "$p/.sbx-acceptance-probe" ) 2>/dev/null; then rm -f "$p/.sbx-acceptance-probe"; r fail "$p is writable"
    else r pass "$p denies writes"; fi
  elif [ -f "$p" ]; then
    if ( : >> "$p" ) 2>/dev/null; then r fail "$p is writable"; else r pass "$p denies writes"; fi
  else
    r skip "$p not present"
  fi
  case "$p" in */*) t="${p%%/*}"; case " $tops " in *" $t "*) ;; *) tops="$tops $t" ;; esac ;; esac
done
for t in $tops; do
  if [ -e "$t.sbx-acceptance" ]; then
    r fail "$t.sbx-acceptance already exists; move it away and rerun"; continue
  fi
  if mv -T "$t" "$t.sbx-acceptance" 2>/dev/null; then
    if mv -T "$t.sbx-acceptance" "$t"; then
      r fail "renaming $t succeeded (renamed back); only the sbx-up hash guard covers this"
    else
      r fail "renaming $t succeeded and renaming it back FAILED; run: mv $t.sbx-acceptance $t"
    fi
  else
    r pass "renaming $t (parent of a read-only mount) is refused"
  fi
done
EOF
  collect readonly < "$work/out"
  guards_clean && ok readonly "sbx-up guards clean afterwards" || bad readonly "sbx-up --check reports changes after the readonly check"
}

check_git_config() {
  if [ "$mode" != direct ]; then skip git-config "direct mode only (the clone has its own .git/config)"; return; fi
  if [ ! -f "$root/.git/config" ]; then skip git-config "$root/.git is not a directory (a linked worktree?)"; return; fi
  if ! guards_clean; then
    skip git-config "sbx-up --check is not clean before the test; review and run sbx-up --accept first"
    return
  fi
  local out rc=0 key
  cp -p "$root/.git/config" "$work/git-config"
  [ ! -f "$root/.git/config.worktree" ] || cp -p "$root/.git/config.worktree" "$work/git-config.worktree"
  git_config_backup=true
  # The fsmonitor command doesn't exist, so a host git run in between fails
  # instead of running anything.
  vm >/dev/null <<'EOF' || true
git config core.hooksPath /tmp/sbx-acceptance-hooks
git config alias.st '!echo sbx-acceptance'
git config core.editor 'sh -c true'
git config pager.log 'sh -c cat'
git config diff.sbxacceptance.command 'sh -c true'
git config --file .git/sbx-acceptance.gitconfig core.sshCommand sbx-acceptance-ssh
git config --add include.path sbx-acceptance.gitconfig
git config remote.origin.uploadpack sbx-acceptance-upload-pack
git remote set-url origin https://example.org/sbx-acceptance.git
git config core.repositoryformatversion 1
git config extensions.worktreeConfig true
git config --file .git/config.worktree core.fsmonitor sbx-acceptance-fsmonitor 2>/dev/null
b="$(git symbolic-ref --short HEAD 2>/dev/null)" && git branch -q --set-upstream-to=origin/main "$b" 2>/dev/null
true
EOF
  out="$(sbx_up_check 2>&1)" || rc=$?
  [ "$rc" != 0 ] && ok git-config "sbx-up --check exits non-zero ($rc)" || bad git-config "sbx-up --check exited 0"
  local keys="config:core.hookspath config:alias.st config:core.editor config:pager.log"
  keys="$keys config:diff.sbxacceptance.command config:include.path"
  keys="$keys config:remote.origin.uploadpack config:remote.origin.url config:extensions.worktreeconfig"
  keys="$keys .git/sbx-acceptance.gitconfig:core.sshcommand"
  # An existing config.worktree is mounted read-only, so the VM can't add to it.
  if [ -f "$work/git-config.worktree" ]; then skip git-config "config.worktree exists, so it is read-only in the sandbox"
  else keys="$keys config.worktree:core.fsmonitor"; fi
  local file
  for key in $keys; do
    file="${key%%:*}"
    case "$file" in config | config.worktree) file=".git/$file" ;; esac
    grep -qF "+ ${key%%:*}: ${key#*:}=" <<< "$out" && ok git-config "reports ${key#*:} ($file)" \
      || bad git-config "does not report ${key#*:} ($file)"
  done
  grep -q "branch\." <<< "$out" && bad git-config "reports the tracking change" || ok git-config "ignores the tracking change"
  cleanup_git_config
  guards_clean && ok git-config ".git/config restored; snapshot unchanged" || bad git-config "guards still report changes after the restore"
}

cleanup_git_config() {
  [ "$git_config_backup" = true ] || return 0
  cat "$work/git-config" > "$root/.git/config"
  if [ -f "$work/git-config.worktree" ]; then cat "$work/git-config.worktree" > "$root/.git/config.worktree"
  else rm -f "$root/.git/config.worktree"; fi
  rm -f "$root/.git/sbx-acceptance.gitconfig" "$work/git-config" "$work/git-config.worktree"
  git_config_backup=false
}

check_remove() {
  if [ "$destructive" != true ]; then skip remove "removes the sandbox and its secrets (needs --destructive)"; return; fi
  local files=("$env_file") before
  [ "$mode" = clone ] || files+=("$local_env_file")
  # `sbx secret ls --sandbox` lists nothing, without an error, for a sandbox
  # that doesn't exist, so only a count taken before the removal means anything.
  before="$(sbx secret ls --sandbox "$name" -q 2>>"$log" | grep -c . || true)"
  (cd "$root" && sbx env rm ${name_args[@]+"${name_args[@]}"} "${files[@]}" --force >/dev/null 2>>"$log") \
    && ok remove "sbx env rm" || { bad remove "sbx env rm failed"; return; }
  if ! sbx secret ls -q >/dev/null 2>>"$log"; then
    bad remove "sbx secret ls failed after the removal"
  elif [ "$before" = 0 ]; then
    skip remove "the sandbox had no sandbox-scoped secrets to remove"
  elif [ -n "$(sbx secret ls --sandbox "$name" -q 2>>"$log")" ]; then
    bad remove "sandbox-scoped secrets remain"
  else
    ok remove "its $before sandbox-scoped secret(s) are gone"
  fi
}

check_claude_session() {
  claude_run "$work/session.jsonl" "Use WebSearch once for: Docker Sandboxes sbx. Then use WebFetch once on https://github.com. Reply with SEARCH_OK or SEARCH_FAIL, then FETCH_OK or FETCH_FAIL. Nothing else."
  local s; s="$(claude_summary "$work/session.jsonl")"
  grep -qx 'MODE auto' <<< "$s" && ok session "permission mode auto" || bad session "permission mode: $(grep '^MODE' <<< "$s" | cut -c6-)"
  local servers; servers="$(grep '^MCP ' <<< "$s" | awk '{print $2}' | tr '\n' ' ')"
  case " $servers " in
    *" mcp-gateway "*) case " $servers " in *" chrome-devtools "*) ok session "MCP servers: $servers" ;; *) bad session "no chrome-devtools; MCP servers: $servers" ;; esac ;;
    *) bad session "no mcp-gateway; MCP servers: $servers" ;;
  esac
  grep -q '^TOOL WebSearch' <<< "$s" && grep -q '^FINAL.*SEARCH_OK' <<< "$s" \
    && ok web "WebSearch works" || bad web "WebSearch: $(grep '^FINAL' <<< "$s" | cut -c7-120)"
  grep -q '^FINAL.*FETCH_OK' <<< "$s" && ok web "WebFetch on github.com works" || bad web "WebFetch github.com: $(grep '^FINAL' <<< "$s" | cut -c7-120)"

  local host=docs.python.org id
  claude_run "$work/fetch.jsonl" "Use WebFetch once on https://$host/3/. Reply with FETCHED if it worked, otherwise BLOCKED. Do not try anything else."
  s="$(claude_summary "$work/fetch.jsonl")"
  # The pending approval is the proof of the block; Claude's reply is informational.
  grep -q '^FINAL.*BLOCKED' <<< "$s" && ok web "Claude reports $host as blocked" || skip web "Claude's reply for $host: $(grep '^FINAL' <<< "$s" | cut -c7-120)"
  id="$(wait_for_approval "$host:443")"
  if [ -n "$id" ]; then
    ok web "pending approval for $host (dismissed)"
    sbx policy approval respond "$id" --option dismiss >/dev/null 2>>"$log" || true
  else
    bad web "no pending approval for $host:443"
  fi
}

# --- main ---------------------------------------------------------------------
mode="$(sandbox_field "$name" mode "$env_file")"
[ -n "$mode" ] || { echo "no sandbox '$name' (create it with config/sbx/bin/sbx-up --create)" >&2; exit 1; }
echo "Acceptance checks for sandbox '$name' ($mode mode, $root)"
echo "sbx output: $log"

if sbx_up_check >/dev/null 2>&1; then
  ok pre "sbx-up preflight and guards clean"
else
  bad pre "sbx-up --check --skip-secrets fails; run it to see why"
fi
if ! vm >/dev/null <<< 'true'; then
  bad pre "cannot exec in sandbox '$name' (create it with sbx-up --create)"
  exit 1
fi

wanted setup && check_setup
wanted clone && check_clone
wanted isolation && check_isolation
wanted credentials && check_credentials
if wanted web || wanted session; then
  if [ "$with_claude" = true ]; then check_claude_session
  else
    wanted session && skip session "drives Claude (needs --claude)"
    wanted web && skip web "drives Claude (needs --claude)"
  fi
fi
wanted policy && check_policy
wanted registries && check_registries
wanted github && check_github
wanted token-scope && check_token_scope
wanted ports && check_ports
wanted readonly && check_readonly
wanted git-config && check_git_config
wanted remove && check_remove

echo
echo "$passed passed, $failed failed, $skipped skipped"
[ "$failed" = 0 ]
