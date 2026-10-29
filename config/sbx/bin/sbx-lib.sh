# shellcheck shell=bash
# sbx-template: sbx-lib.sh 0.1.0
#
# Helpers shared by sbx-up, bootstrap.sh and acceptance.sh; sourced, never run.

# SHA-256 command: sha256sum (Linux, newer macOS) or shasum (macOS). Both
# print "<hash>  <file>", so digests match whichever one a machine has.
# shellcheck disable=SC2034  # used by the scripts that source this file
if command -v sha256sum >/dev/null 2>&1; then sha256=(sha256sum); else sha256=(shasum -a 256); fi

# A size such as 50g, 512MiB or a byte count, in MiB.
to_mib() {
  local v; v="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed 's/i\{0,1\}b\{0,1\}$//')"
  case "$v" in
    *t) echo $(( ${v%t} * 1024 * 1024 )) ;;
    *g) echo $(( ${v%g} * 1024 )) ;;
    *m) echo $(( ${v%m} )) ;;
    *)  echo $(( v / 1024 / 1024 )) ;;
  esac
}

# name: from an sbxenv.yaml, without quotes, a trailing comment or a CR.
env_name() {
  sed -n 's/^name:[[:space:]]*//p' "$1" | head -n1 \
    | sed 's/[[:space:]]#.*//' | tr -d '"'"'"'\r' | sed 's/[[:space:]]*$//'
}

# One field of sandbox $1 from `sbx ls --json`:
#   sandbox_field NAME mode ENV_FILE   clone or direct
#   sandbox_field NAME port PORT       host port published for sandbox port PORT
# Prints nothing if the sandbox doesn't exist. Fails, with a message, if sbx
# can't list sandboxes or its output has an unknown shape, so callers never
# mistake an error for "no sandbox".
#
# Mode: sbx mounts the environment file itself read-only into a shared
# (direct-mode) workspace; a clone-mode sandbox lists only the project
# directory. Paths are compared after resolving symlinks.
sandbox_field() {
  local json
  if ! json="$(sbx ls --json 2>/dev/null)"; then
    echo "sbx ls failed; can't tell whether sandbox '$1' exists" >&2
    return 1
  fi
  printf '%s' "$json" | python3 -I -c '
import json, os, sys
name, field, arg = sys.argv[1:4]
try:
    d = json.load(sys.stdin)
    sandboxes = d if isinstance(d, list) else d["sandboxes"]
except (ValueError, KeyError, TypeError):
    sys.exit("unexpected `sbx ls --json` output")
for s in sandboxes:
    if s.get("name") != name:
        continue
    if field == "mode":
        env = os.path.realpath(arg)
        ro = [os.path.realpath(w[:-3]) for w in s.get("workspaces") or [] if w.endswith(":ro")]
        print("direct" if env in ro else "clone")
    elif field == "port":
        for p in s.get("ports") or []:
            if p.get("sandbox_port") == int(arg):
                print(p.get("host_port"))
    break
' "$1" "$2" "$3"
}
