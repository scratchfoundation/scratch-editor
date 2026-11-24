#!/bin/bash

# update-legal.sh — Write LICENSE and TRADEMARK files from their single sources.
#
# License text lives in LICENSES/<SPDX-id>.txt at the monorepo root. Each
# package's LICENSE, and the root LICENSE itself, is a copy of the file named
# by the "license" field in that directory's package.json. To change a
# package's license, change its "license" field (adding the text to LICENSES/
# if it's new) and run this script.
#
# TRADEMARK has one source, the root TRADEMARK, copied into every workspace.
#
# Every target is checked before anything is written, so an error leaves the
# tree untouched.
#
# Usage:
#   scripts/update-legal.sh                                # root + every workspace
#   scripts/update-legal.sh <package-name> [<name>...]     # named workspaces only
#
# Package names can be bare ("scratch-vm") or scoped ("@scratch/scratch-vm").
# Driven through npm:
#   npm run update-legal                                   # root + every workspace
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

# npm query walks the installed tree. Without node_modules it finds no
# workspaces, which would make this script (and the CI check that runs it)
# silently skip every package.
if [ "$(jq 'length' <<<"$WORKSPACE_JSON")" -eq 0 ]; then
    echo "Error: npm found no workspaces. Run 'npm ci' (or 'npm install') first." >&2
    exit 1
fi

# "." is the monorepo root: it gets a LICENSE but is the TRADEMARK source.
target_dirs=()
if [ "$#" -eq 0 ]; then
    target_dirs+=(".")
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

# Pass 1: resolve every target's license source, collecting all errors.
license_sources=()
errors=0
for dir in "${target_dirs[@]}"; do
    license=$(jq -r '.license // empty' "${dir}/package.json")
    source=""
    if [ -z "$license" ]; then
        echo "Error: ${dir}/package.json has no \"license\" field." >&2
        errors=$((errors + 1))
    elif ! [[ "$license" =~ ^[A-Za-z0-9.+-]+$ ]]; then
        # Compound expressions ("MIT OR Apache-2.0", "GPL-2.0 WITH ...") need
        # a person to decide what the LICENSE file should say.
        echo "Error: ${dir}/package.json license \"${license}\" is not a single SPDX id;" \
            "write that LICENSE by hand and teach this script about it." >&2
        errors=$((errors + 1))
    elif [ ! -f "LICENSES/${license}.txt" ]; then
        echo "Error: ${dir}/package.json license \"${license}\" has no LICENSES/${license}.txt." >&2
        errors=$((errors + 1))
    else
        source="LICENSES/${license}.txt"
    fi
    license_sources+=("$source")
done

if [ "$errors" -gt 0 ]; then
    echo "No files were changed." >&2
    exit 1
fi

# Pass 2: write.
for i in "${!target_dirs[@]}"; do
    dir="${target_dirs[$i]}"
    source="${license_sources[$i]}"
    if [ "$dir" = "." ]; then
        echo "  Updating LICENSE from ${source}"
        cp -f "$source" LICENSE
    else
        echo "  Updating ${dir}/LICENSE from ${source}, ${dir}/TRADEMARK"
        rm -f "${dir}/LICENSE" "${dir}/TRADEMARK"
        cp -f "$source" "${dir}/LICENSE"
        cp -f TRADEMARK "${dir}/TRADEMARK"
    fi
done
