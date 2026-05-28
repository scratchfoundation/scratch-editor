#!/bin/bash

# update-legal.sh — Refresh LICENSE and TRADEMARK in workspace packages
# from the monorepo root so every workspace ships the same legal text.
#
# Usage:
#   scripts/update-legal.sh                                # every workspace
#   scripts/update-legal.sh <package-name> [<name>...]     # named workspaces
#
# Package names can be bare ("scratch-vm") or scoped ("@scratch/scratch-vm").
# Driven through npm:
#   npm run update-legal                                   # every workspace
#   npm run update-legal -- @scratch/scratch-storage       # one workspace

set -e

require_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: '${cmd}' is required but not installed." >&2
        exit 1
    fi
}

require_command jq
require_command npm

MONOREPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$MONOREPO_ROOT"

# Ask npm where each workspace lives — no assumption about the directory
# layout. `npm query .workspace` returns a JSON array of workspace nodes;
# `.location` is the workspace path relative to the monorepo root, the same
# field scripts/npm-version.sh and scripts/update-gha-workflows.ts read.
WORKSPACE_JSON=$(npm query .workspace)

target_dirs=()
if [ "$#" -eq 0 ]; then
    # Capture jq's output in a command substitution (rather than streaming
    # through process substitution) so a jq failure propagates through set -e
    # instead of leaving the while loop with empty input and exit 0.
    locations=$(jq -r '.[].location' <<<"$WORKSPACE_JSON")
    while IFS= read -r dir; do
        target_dirs+=("$dir")
    done <<<"$locations"
else
    for name in "$@"; do
        # Accept bare ("scratch-vm") or scoped ("@scratch/scratch-vm").
        dir=$(jq -r --arg n "$name" '
            (map(select(.name == $n or .name == "@scratch/\($n)"))
             | first
             | .location) // empty
        ' <<<"$WORKSPACE_JSON")
        if [ -z "$dir" ]; then
            echo "Error: unknown workspace '$name'" >&2
            exit 1
        fi
        target_dirs+=("$dir")
    done
fi

for dir in "${target_dirs[@]}"; do
    echo "  Updating ${dir}/{LICENSE,TRADEMARK}"
    rm -f "${dir}/LICENSE" "${dir}/TRADEMARK"
    cp -f LICENSE TRADEMARK "${dir}/"
done
