#!/usr/bin/env bash
# sbx-template: bootstrap.sh 0.3.0
#
# Per-machine baseline for Docker Sandboxes (sbx). Idempotent: a second run
# changes nothing.
#
#   bootstrap.sh                       apply the baseline, report the rest
#   bootstrap.sh --check               report only; exit 1 if anything is off
#   bootstrap.sh --docker-volume 50g   also raise sandbox.disk.dockerVolume
#
# Runs on macOS and Linux. What it does:
#   - checks the pinned sbx version and that you are signed in
#   - on Linux, checks that you can use KVM (/dev/kvm), which local sandboxes need
#   - turns SSH agent forwarding off
#   - initializes the global `balanced` policy if no policy exists (never resets)
#   - reports the Docker volume size, and raises it only when asked
#   - checks that a kit builder is available (host Docker that can export OCI
#     images, or SBX_KIT_BUILDER=sandbox)
#   - reports the kit source settings
set -euo pipefail
# shellcheck source-path=SCRIPTDIR source=sbx-lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/sbx-lib.sh"

SBX_PINNED_VERSION="${SBX_PINNED_VERSION:-0.48.0}"

# How to install or upgrade sbx and start host Docker on this OS
# (https://docs.docker.com/ai/sandboxes/install/).
case "$(uname -s)" in
  Darwin)
    sbx_install="brew trust docker/tap && brew install docker/tap/sbx"
    sbx_upgrade="brew upgrade docker/tap/sbx"
    docker_start="start Docker Desktop"
    containerd_store="enable the containerd image store in Docker Desktop's settings" ;;
  Linux)
    sbx_install="curl -fsSL https://get.docker.com | sudo REPO_ONLY=1 sh && sudo apt install docker-sbx (Ubuntu 24.04+; see https://docs.docker.com/ai/sandboxes/install/)"
    sbx_upgrade="sudo apt update && sudo apt install --only-upgrade docker-sbx"
    docker_start="start Docker Engine (sudo systemctl start docker)"
    containerd_store='enable the containerd image store ("features": {"containerd-snapshotter": true} in /etc/docker/daemon.json, then restart Docker)' ;;
  *)
    sbx_install="see https://docs.docker.com/ai/sandboxes/install/"
    sbx_upgrade="$sbx_install"
    docker_start="start Docker"
    containerd_store="enable Docker's containerd image store" ;;
esac

mode=apply
docker_volume=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check) mode=check ;;
    --docker-volume) docker_volume="${2:?--docker-volume needs a size, e.g. 50g}"; shift ;;
    -h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

failures=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
info() { printf '  · %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*"; failures=$((failures + 1)); }

echo "sbx baseline ($mode)"

# --- sbx version --------------------------------------------------------------
if ! command -v sbx >/dev/null 2>&1; then
  fail "sbx is not installed: $sbx_install"
  exit 1
fi
installed="$(sbx version 2>/dev/null | awk '{print $3}' | sed 's/^v//')"
if [ "$installed" = "$SBX_PINNED_VERSION" ]; then
  ok "sbx $installed (pinned)"
else
  # Kits, env files and skills are experimental; flags were renamed in 0.48.
  fail "sbx $installed, but this setup is tested with $SBX_PINNED_VERSION ($sbx_upgrade, or set SBX_PINNED_VERSION to override)"
fi

# --- KVM (Linux) --------------------------------------------------------------
if [ "$(uname -s)" = Linux ]; then
  if [ ! -e /dev/kvm ]; then
    fail "no /dev/kvm: enable hardware virtualization (nested virtualization inside a VM)"
  elif [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
    ok "KVM available (/dev/kvm)"
  else
    fail "can't use /dev/kvm: sudo usermod -aG kvm \"\$USER\", then sign out and back in (or newgrp kvm)"
  fi
fi

# --- sign-in ------------------------------------------------------------------
auth="$(sbx diagnose --json 2>/dev/null | python3 -I -c '
import json, sys
for c in json.load(sys.stdin)["checks"]:
    if c["name"] == "Authentication":
        print(c["status"]); break
' || true)"
if [ "$auth" = "pass" ]; then ok "signed in to Docker"; else fail "not signed in: run 'sbx login'"; fi

# --- SSH agent forwarding -----------------------------------------------------
# The setting takes effect when the daemon restarts. A restart stops running
# sandboxes, so it is deferred while any exist; the marker remembers that the
# running daemon may still forward the agent.
restart_marker="${XDG_STATE_HOME:-$HOME/.local/state}/sbx-up/daemon-restart-pending"
restart_daemon_if_idle() {
  local running
  if running="$(sbx ls -q 2>/dev/null)" && [ -z "$running" ]; then
    sbx daemon restart >/dev/null
    rm -f "$restart_marker"
    return 0
  fi
  mkdir -p "$(dirname "$restart_marker")" && : > "$restart_marker"
  return 1
}
if [ "$(sbx settings get ssh.agentForwardingEnabled)" != "false" ]; then
  if [ "$mode" = apply ]; then
    sbx settings set ssh.agentForwardingEnabled false >/dev/null
    if restart_daemon_if_idle; then ok "SSH agent forwarding turned off (daemon restarted)"
    else warn "SSH agent forwarding set to off; it takes effect after 'sbx daemon restart' (stop your sandboxes first, or rerun this script once none exist)"; fi
  else
    fail "SSH agent forwarding is on (run without --check to turn it off)"
  fi
elif [ ! -f "$restart_marker" ]; then
  ok "SSH agent forwarding is off"
elif [ "$mode" = apply ] && restart_daemon_if_idle; then
  ok "SSH agent forwarding is off (daemon restarted to apply it)"
else
  warn "SSH agent forwarding is set to off but the daemon hasn't restarted since; run 'sbx daemon restart' once your sandboxes are stopped, then rerun this script"
fi

# --- global network policy ----------------------------------------------------
# Initialize only when nothing exists. `sbx policy reset` would stop every
# sandbox and drop every approval, so this script never calls it.
# Only global rules count; approvals for one sandbox don't initialize it.
if ! rules="$(sbx policy ls --json 2>/dev/null | python3 -I -c '
import json, sys
print(sum(1 for r in json.load(sys.stdin).get("rules") or [] if r.get("scope") == "global"))
' 2>/dev/null)"; then
  fail "can't read the network policy (sbx policy ls --json failed)"
elif [ "$rules" -gt 0 ]; then
  ok "global policy initialized ($rules rules; not changed)"
elif [ "$mode" = apply ]; then
  sbx policy init balanced >/dev/null
  ok "global policy initialized: balanced"
else
  fail "global policy not initialized (run without --check, or 'sbx policy init balanced')"
fi

# --- Docker volume size -------------------------------------------------------
volume="$(sbx settings get sandbox.disk.dockerVolume)"
if [ -n "$docker_volume" ] && [ "$(to_mib "$docker_volume")" -gt "$(to_mib "$volume")" ]; then
  if [ "$mode" = apply ]; then
    sbx settings set sandbox.disk.dockerVolume "$docker_volume" >/dev/null
    warn "sandbox.disk.dockerVolume: $volume → $docker_volume (new sandboxes only; recreate existing ones to use it)"
  else
    fail "sandbox.disk.dockerVolume is $volume, wanted at least $docker_volume"
  fi
else
  info "sandbox.disk.dockerVolume: $volume (applies when a sandbox is created)"
fi

# --- kit builder --------------------------------------------------------------
# A kit with a Dockerfile is built by host Docker, which must be able to export
# OCI images: the containerd image store, or a docker-container buildx builder.
if [ "${SBX_KIT_BUILDER:-}" = "sandbox" ]; then
  ok "kit builder: sbx builder sandbox (SBX_KIT_BUILDER=sandbox)"
elif ! docker info >/dev/null 2>&1; then
  fail "host Docker is not running: $docker_start, or export SBX_KIT_BUILDER=sandbox"
elif docker info --format '{{json .DriverStatus}}' 2>/dev/null | grep -q 'io.containerd.snapshotter' \
  || docker buildx inspect 2>/dev/null | grep -q '^Driver:.*docker-container'; then
  ok "kit builder: host Docker (can export OCI images)"
else
  fail "host Docker can't export OCI images: $containerd_store, or export SBX_KIT_BUILDER=sandbox"
fi

# --- kit sources --------------------------------------------------------------
info "kit.allowLocalKits: $(sbx settings get kit.allowLocalKits)"
info "kit.allowedSources: $(sbx settings get kit.allowedSources)"
info "kit.requireSignature: $(sbx settings get kit.requireSignature)"

echo
if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed."
  exit 1
fi
echo "Baseline OK."
