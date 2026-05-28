#!/bin/bash

# add-repo.sh — Add an existing GitHub repository into the scratch-editor monorepo.
#
# Imports a single repo with full git history. Rewrites the source repo's history
# so all files live under packages/<repo-name>/, merges it into the current branch,
# rewires inter-package dependencies, updates the root workspaces list, and (by
# default) regenerates CI workflows.
#
# Prerequisites:
#   - git-filter-repo   (brew install git-filter-repo  | sudo apt install git-filter-repo)
#   - jq                (brew install jq               | sudo apt install jq)
#   - perl              (pre-installed on macOS, NixOS, and most Linux distributions)
#
# Usage:
#   ./scripts/add-repo.sh <repo-name> [options]
#
# Options:
#   --source-branch <branch>   Branch to import (default: auto-detect develop, then main, then master)
#   --org <github-org>         GitHub organization (default: scratchfoundation)
#   --cache-dir <path>         Local cache dir holding clones of source repos (default: ./..)
#   --no-ci                    Skip CI workflow regeneration at the end
#   --continue-on-error        If a per-package package.json rewrite fails
#                              during the cross-workspace dep rewire step, log
#                              the failure to add-repo.errors.log and keep
#                              going (default: hard-fail on the first failure).
#                              Does not affect the final lockfile install at
#                              the end of the script, which always hard-fails.
#   --help, -h                 Show this help message
#
# Examples:
#   ./scripts/add-repo.sh scratch-paint
#   ./scripts/add-repo.sh scratch-storage --source-branch develop
#   ./scripts/add-repo.sh scratch-audio --org myfork --cache-dir ~/GitHub
#
# Failure recovery:
#   The script makes its destructive changes against the current branch. If
#   anything goes wrong, the simplest recovery is:
#       git branch -D <this-branch>   (if you made a fresh branch for the import)
#     or
#       git reset --hard <pre-script-commit>
#     and remove any leftover temp dir:
#       rm -rf ./add-repo.tmp

set -e

### Anchor to monorepo root ###

# Resolve MONOREPO_ROOT (and any path defaults derived from it) to absolute
# paths up front so behavior is independent of the caller's CWD. User-supplied
# relative paths (e.g. via --cache-dir) are resolved against the caller's CWD
# at parse time and stored absolute thereafter.
if ! MONOREPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    echo "Error: must be run inside a git repository." >&2
    exit 1
fi

### Defaults (all paths absolute) ###

GITHUB_ORG="scratchfoundation"
MONOREPO_URL="https://github.com/scratchfoundation/scratch-editor.git"
NPM_ORGANIZATION="@scratch"
BUILD_CACHE="$(cd "${MONOREPO_ROOT}/.." && pwd)"   # parent of monorepo root
BUILD_TMP="${MONOREPO_ROOT}/add-repo.tmp"
SOURCE_BRANCH=""                                   # empty means "auto-detect"
SKIP_CI=false
CONTINUE_ON_ERROR=false

### Argument parsing ###

usage() {
    sed -n '/^# Usage:/,/^[^#]/{ /^#/s/^# \{0,1\}//p; }' "$0"
    exit "${1:-0}"
}

# Reject a flag whose value is missing or itself another flag.
require_value() {
    local flag="$1"
    local value="$2"
    if [ -z "$value" ] || [[ "$value" == --* ]]; then
        echo "Error: ${flag} requires a value." >&2
        usage 1
    fi
}

REPO_NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source-branch)
            require_value "$1" "${2-}"
            SOURCE_BRANCH="$2"
            shift 2
            ;;
        --org)
            require_value "$1" "${2-}"
            GITHUB_ORG="$2"
            shift 2
            ;;
        --cache-dir)
            require_value "$1" "${2-}"
            # Resolve to absolute path against the caller's CWD. If the dir
            # doesn't exist yet, leave the value as the user typed it; the
            # pre-flight check below will print a clear error.
            if [ -d "$2" ]; then
                BUILD_CACHE="$(cd "$2" && pwd)"
            else
                BUILD_CACHE="$2"
            fi
            shift 2
            ;;
        --no-ci)
            SKIP_CI=true
            shift
            ;;
        --continue-on-error)
            CONTINUE_ON_ERROR=true
            shift
            ;;
        --help|-h)
            usage 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage 1
            ;;
        *)
            if [ -z "$REPO_NAME" ]; then
                REPO_NAME="$1"
            else
                echo "Unexpected argument: $1" >&2
                usage 1
            fi
            shift
            ;;
    esac
done

if [ -z "$REPO_NAME" ]; then
    echo "Error: repository name is required." >&2
    usage 1
fi

# MONOREPO_ROOT was computed at the top of the script (we've already cd'd there).
PACKAGE_DIR="packages/${REPO_NAME}"
PACKAGE_PATH="${MONOREPO_ROOT}/${PACKAGE_DIR}"

### Prerequisite checks ###

echo "==> Checking prerequisites..."

require_command() {
    local cmd="$1"
    local hint="$2"
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: '${cmd}' is required but not installed." >&2
        echo "${hint}" >&2
        exit 1
    fi
}

if ! git filter-repo -h &> /dev/null; then
    echo "Error: git-filter-repo is required but not installed." >&2
    echo "Try: brew install git-filter-repo   or: sudo apt install git-filter-repo" >&2
    exit 1
fi

require_command jq   "Try: brew install jq          or: sudo apt install jq"
require_command perl "Perl is used for portable in-place file rewrites and should already be present on macOS, NixOS, and Linux."

if [ -d "$PACKAGE_PATH" ]; then
    echo "Error: ${PACKAGE_DIR} already exists in the monorepo." >&2
    echo "If you want to re-add it, remove it first." >&2
    exit 1
fi

if [ -d "$BUILD_TMP" ]; then
    echo "Error: Temporary directory ${BUILD_TMP} already exists." >&2
    echo "A previous run may have failed. Remove it with: rm -rf ${BUILD_TMP}" >&2
    exit 1
fi

if [ ! -d "$BUILD_CACHE" ]; then
    echo "Error: Cache directory ${BUILD_CACHE} does not exist." >&2
    echo "Either pass --cache-dir <path-to-existing-dir>, or symlink one, e.g.:" >&2
    echo "  ln -s ~/GitHub ${BUILD_CACHE}" >&2
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "Error: Working tree is not clean. Please commit or stash your changes." >&2
    exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "    Monorepo root:    ${MONOREPO_ROOT}"
echo "    Current branch:   ${CURRENT_BRANCH}"
echo "    Target package:   ${PACKAGE_DIR}"
echo "    GitHub org:       ${GITHUB_ORG}"
echo "    Source repo:      ${GITHUB_ORG}/${REPO_NAME}"

### Helper functions ###

# Thanks to https://stackoverflow.com/a/17841619
join_args() {
    local d=${1-} f=${2-}
    if shift 2; then
        printf %s "$f" "${@/#/$d}"
    fi
}

# Clone a repository into BUILD_TMP as a bare repo.
# Uses a local cache directory for speed when available.
clone_repository() {
    local repo="$1"
    local org_and_repo="${GITHUB_ORG}/${repo}"

    echo "==> Cloning ${org_and_repo}..."

    mkdir -p "$BUILD_TMP"

    if [ -d "${BUILD_CACHE}/${repo}" ]; then
        echo "    Using local cache at ${BUILD_CACHE}/${repo}"
        git -C "${BUILD_CACHE}/${repo}" fetch --all
        git -C "$BUILD_TMP" clone --bare --dissociate \
            --reference "$(realpath "$BUILD_CACHE")/${repo}" \
            "git@github.com:${org_and_repo}.git" "${repo}"
    else
        echo "    No local cache for ${repo}; cloning directly from GitHub..."
        git -C "$BUILD_TMP" clone --bare "git@github.com:${org_and_repo}.git" "${repo}"
    fi

    # Disconnect from the reference repo so we can safely rewrite history.
    # `--dissociate` on the clone above already detaches from the reference repo,
    # but `repack -a` ensures everything is locally packed, and removing the
    # alternates file (note: bare repos have it directly under `objects/info/`,
    # without a `.git/` prefix) is a defensive belt-and-braces step.
    git -C "${BUILD_TMP}/${repo}" repack -a
    rm -f "${BUILD_TMP}/${repo}/objects/info/alternates"
}

# Detect a sensible default source branch in the cloned bare repo.
# Tries develop, then main, then master.
detect_default_branch() {
    local repo="$1"
    local b
    for b in develop main master; do
        if git -C "${BUILD_TMP}/${repo}" show-ref --verify --quiet "refs/heads/${b}"; then
            echo "$b"
            return 0
        fi
    done
    return 1
}

# Rewrite all paths in the cloned repo to live under a subdirectory.
move_repository_subdirectory() {
    local repo="$1"
    local subdirectory="$2"

    echo "==> Rewriting history to move files under ${subdirectory}..."

    # Make filter-repo accept this as a fresh clone.
    git -C "${BUILD_TMP}/${repo}" gc

    local has_submodules
    has_submodules=$(
        git -C "${BUILD_TMP}/${repo}" branch --format="%(refname:short)" | while read -r branch; do
            if git -C "${BUILD_TMP}/${repo}" cat-file -e "${branch}:.gitmodules" &> /dev/null; then
                echo "yep"
                break
            fi
        done
    )

    if [ "$has_submodules" != "yep" ]; then
        echo "    Repository does NOT have submodules"
        git -C "${BUILD_TMP}/${repo}" filter-repo --to-subdirectory-filter "$subdirectory"
    else
        # TODO(submodules): this branch was carried over from build-monorepo.sh.
        # It has never been exercised against a real submodules-bearing repo since the
        # monorepo migration began. When the first repo with submodules lands, run it
        # carefully on a throwaway clone first.
        echo "    Repository DOES have submodules"
        # The .gitmodules file must stay in the repository root, but the paths inside
        # it must be rewritten; see https://github.com/newren/git-filter-repo/issues/158
        git -C "${BUILD_TMP}/${repo}" filter-repo \
            --filename-callback "return filename if filename == b'.gitmodules' else b'${subdirectory}'+filename" \
            --blob-callback "if blob.data.startswith(b'[submodule '): blob.data = blob.data.replace(b'path = ', b'path = ${subdirectory}')"
    fi
}

# Get the existing monorepo workspace package names (without the @scratch/ prefix).
get_existing_packages() {
    jq -r '.workspaces[]' "${MONOREPO_ROOT}/package.json" | sed 's|^packages/||'
}

# Apply a jq filter to FILE in place, via a sibling tempfile. Forwards all
# arguments after FILE to jq; the temp file is mv'd into place only on jq
# exit 0, so a jq failure leaves FILE untouched and propagates a non-zero
# return up to set -e or to an `if !` caller that wants to react.
#
# `cp -p` seeds the tempfile with FILE's content and mode, so the subsequent
# `>` truncate-and-write leaves the mode alone and the final mv preserves
# it. Without this, mktemp's default 0600 would silently downgrade FILE
# from 0644.
jq_in_place() {
    local file="$1"
    shift
    local tmp
    tmp=$(mktemp "${file}.XXXXXX") || return 1
    cp -p "$file" "$tmp" || { rm -f "$tmp"; return 1; }
    if jq "$@" "$file" > "$tmp"; then
        mv "$tmp" "$file"
    else
        local status=$?
        rm -f "$tmp"
        return "$status"
    fi
}

# Handle a failed dep replacement. Default: hard-fail. --continue-on-error: log and continue.
package_replacement_error() {
    local package="$1"
    local dep="$2"
    echo "***ERROR*** Could not replace ${dep} in ${package} with the local workspace version." >&2
    echo "${package}: ${dep}" >> "${MONOREPO_ROOT}/add-repo.errors.log"
    if [ "$CONTINUE_ON_ERROR" = false ]; then
        echo "(re-run with --continue-on-error to log and keep going instead of failing)" >&2
        exit 1
    fi
    echo "Continuing despite the error because --continue-on-error is set." >&2
}

### Run ###

echo ""
echo "=========================================="
echo "  Adding ${REPO_NAME} to the monorepo"
echo "=========================================="
echo ""

# 1. Clone the source repo into a bare temp checkout.
clone_repository "$REPO_NAME"

# 2. Resolve the source branch.
if [ -z "$SOURCE_BRANCH" ]; then
    if SOURCE_BRANCH="$(detect_default_branch "$REPO_NAME")"; then
        echo "==> Auto-detected source branch: ${SOURCE_BRANCH}"
    else
        echo "Error: Could not auto-detect a source branch (tried develop, main, master)." >&2
        echo "Available branches:" >&2
        git -C "${BUILD_TMP}/${REPO_NAME}" branch --list | sed 's/^/  /' >&2
        echo "Pass --source-branch <branch> explicitly." >&2
        rm -rf "$BUILD_TMP"
        exit 1
    fi
else
    if ! git -C "${BUILD_TMP}/${REPO_NAME}" show-ref --verify --quiet "refs/heads/${SOURCE_BRANCH}"; then
        echo "Error: Branch '${SOURCE_BRANCH}' not found in ${REPO_NAME}." >&2
        echo "Available branches:" >&2
        git -C "${BUILD_TMP}/${REPO_NAME}" branch --list | sed 's/^/  /' >&2
        rm -rf "$BUILD_TMP"
        exit 1
    fi
    echo "==> Using specified source branch: ${SOURCE_BRANCH}"
fi

# 3. Rewrite history so everything lives under packages/<repo-name>/.
move_repository_subdirectory "$REPO_NAME" "${PACKAGE_DIR}/"

# 4. Merge the rewritten history into the current branch.
echo "==> Merging ${REPO_NAME}#${SOURCE_BRANCH} into ${CURRENT_BRANCH}..."

REMOTE_NAME="temp-${REPO_NAME}"
git remote add "$REMOTE_NAME" "$(realpath "${BUILD_TMP}")/${REPO_NAME}"
git fetch --no-tags "$REMOTE_NAME"

MERGE_MESSAGE="feat: add ${REPO_NAME}#${SOURCE_BRANCH} as ${PACKAGE_DIR}"
git merge --no-ff --allow-unrelated-histories "${REMOTE_NAME}/${SOURCE_BRANCH}" -m "$MERGE_MESSAGE"

git remote remove "$REMOTE_NAME"

echo "    Merge complete."

# Remove BUILD_TMP now, before any `git add -A` could accidentally stage it.
echo "==> Cleaning up temporary clone..."
rm -rf "$BUILD_TMP"

# 5. Fix up the new package's package.json: rename, version, strip repo-level config.
echo "==> Fixing up ${PACKAGE_DIR}/package.json..."

# Remove repo-level metadata that doesn't apply inside a workspace. The
# monorepo provides its own equivalents at the root, and per-package
# copies (e.g. GitHub workflow YAMLs under packages/*/.github/workflows/)
# are inert: GitHub Actions only honors workflows at the repo root.
rm -rf "${PACKAGE_PATH}/.github" \
       "${PACKAGE_PATH}/.husky" \
       "${PACKAGE_PATH}/package-lock.json" \
       "${PACKAGE_PATH}/renovate.json" \
       "${PACKAGE_PATH}/renovate.json5" \
       "${PACKAGE_PATH}/release.config.js" \
       "${PACKAGE_PATH}/release.config.cjs" \
       "${PACKAGE_PATH}/release.config.mjs" \
       "${PACKAGE_PATH}/release.config.ts" \
       "${PACKAGE_PATH}/.releaserc" \
       "${PACKAGE_PATH}/.releaserc.js" \
       "${PACKAGE_PATH}/.releaserc.json" \
       "${PACKAGE_PATH}/.releaserc.yaml" \
       "${PACKAGE_PATH}/.releaserc.yml" \
       "${PACKAGE_PATH}/commitlint.config.js" \
       "${PACKAGE_PATH}/commitlint.config.cjs" \
       "${PACKAGE_PATH}/commitlint.config.mjs" \
       "${PACKAGE_PATH}/commitlint.config.ts" \
       "${PACKAGE_PATH}/.commitlintrc" \
       "${PACKAGE_PATH}/.commitlintrc.js" \
       "${PACKAGE_PATH}/.commitlintrc.json" \
       "${PACKAGE_PATH}/.commitlintrc.yaml" \
       "${PACKAGE_PATH}/.commitlintrc.yml" \
       "${PACKAGE_PATH}/.editorconfig" \
       "${PACKAGE_PATH}/.gitattributes" \
       "${PACKAGE_PATH}/.nvmrc" \
       "${PACKAGE_PATH}/.circleci" \
       "${PACKAGE_PATH}/.travis.yml" \
       "${PACKAGE_PATH}/.appveyor.yml"

MONOREPO_VERSION=$(jq -r '.version' "${MONOREPO_ROOT}/package.json")
if [ -r "${PACKAGE_PATH}/package.json" ]; then
    # shellcheck disable=SC2016
    # The single-quoted fragments below are jq filter syntax. $PACKAGE_NAME,
    # $MONOREPO_URL and $MONOREPO_VERSION are jq variables (bound via --arg),
    # not shell variables — they must NOT be expanded by the shell.
    jq_in_place "${PACKAGE_PATH}/package.json" \
        --arg PACKAGE_NAME "${NPM_ORGANIZATION}/${REPO_NAME}" \
        --arg MONOREPO_URL "$MONOREPO_URL" \
        --arg MONOREPO_VERSION "$MONOREPO_VERSION" \
        -f <(join_args ' | ' \
            '.name |= $PACKAGE_NAME' \
            '.version |= $MONOREPO_VERSION' \
            '.repository.url |= $MONOREPO_URL' \
            'del(.repository.sha)' \
            'if (.scripts.prepare == "husky install") or (.scripts.prepare == "husky") then del(.scripts.prepare) else . end' \
            'del(.scripts."semantic-release")' \
            'del(.scripts.commitmsg)' \
            'del(.scripts.version)' \
            'if (.scripts // {}) == {} then del(.scripts) else . end' \
            'del(.config.commitizen)' \
            'if (.config // {}) == {} then del(.config) else . end' \
            'del(.devDependencies."@commitlint/cli")' \
            'del(.devDependencies."@commitlint/config-conventional")' \
            'del(.devDependencies."@commitlint/travis-cli")' \
            'del(.devDependencies."cz-conventional-changelog")' \
            'del(.devDependencies."husky")' \
            'del(.devDependencies."semantic-release")' \
            'del(.devDependencies."scratch-semantic-release-config")' \
            'if (.devDependencies // {}) == {} then del(.devDependencies) else . end' \
        )
fi

# Normalize so subsequent diffs are minimal.
if command -v sort-package-json &> /dev/null; then
    sort-package-json "${PACKAGE_PATH}/package.json"
else
    npx --yes sort-package-json "${PACKAGE_PATH}/package.json" \
        || echo "    Note: sort-package-json unavailable; skipping normalization."
fi

# 6. Insert the new package into the root workspaces array at the correct
#    position for `npm run --workspaces build` order.
echo "==> Updating root package.json workspaces..."

# The new package must appear AFTER any existing workspace it depends on (so
# `npm run --workspaces build` builds the dep first). We do this by locating
# the last existing workspace among the new package's monorepo deps and
# inserting just after it. If the new package has no monorepo deps, it goes
# at position 0.
#
# This is a "last dep wins" heuristic, not a full topological sort. It also
# implies the new package is placed before any existing workspace that
# depends on it — but ONLY when the existing workspaces array is itself in
# valid topological order (which is the case for the hand-curated array in
# this monorepo). The script does not scan existing packages for
# reverse-dependencies and does not re-validate the existing order.
#
# Adding to workspaces BEFORE rewiring deps (step 7) lets npm resolve the new
# package as a workspace rather than fetching from the registry.
WORKSPACE_ENTRY="packages/${REPO_NAME}"
if jq -e ".workspaces | index(\"${WORKSPACE_ENTRY}\")" "${MONOREPO_ROOT}/package.json" > /dev/null 2>&1; then
    echo "    '${WORKSPACE_ENTRY}' already in workspaces."
else
    INSERT_AFTER_INDEX=-1
    for EXISTING in $(get_existing_packages); do
        [ "$EXISTING" = "$REPO_NAME" ] && continue
        # The new package may declare its monorepo deps either by bare name
        # (e.g. "scratch-svg-renderer") or already with the @scratch/ prefix
        # (e.g. "@scratch/scratch-svg-renderer"). Either form means "I depend
        # on this monorepo package."
        EXISTING_FULL="${NPM_ORGANIZATION}/${EXISTING}"
        HAS_DEP=$(jq -r --arg bare "${EXISTING}" --arg full "${EXISTING_FULL}" '
            any(
                (.dependencies // {}, .devDependencies // {}, .peerDependencies // {}, .optionalDependencies // {})
                | keys[]; . == $bare or . == $full
            )
        ' "${PACKAGE_PATH}/package.json")
        if [ "$HAS_DEP" = "true" ]; then
            EXISTING_INDEX=$(jq -r --arg p "packages/${EXISTING}" '.workspaces | index($p) // -1' "${MONOREPO_ROOT}/package.json")
            if [ "$EXISTING_INDEX" -gt "$INSERT_AFTER_INDEX" ]; then
                INSERT_AFTER_INDEX="$EXISTING_INDEX"
            fi
        fi
    done
    INSERT_AT=$((INSERT_AFTER_INDEX + 1))
    jq_in_place "${MONOREPO_ROOT}/package.json" \
        ".workspaces |= (.[:${INSERT_AT}] + [\"${WORKSPACE_ENTRY}\"] + .[${INSERT_AT}:])"
    if [ "$INSERT_AT" = "0" ]; then
        echo "    Prepended '${WORKSPACE_ENTRY}' (no monorepo deps detected)."
    else
        echo "    Inserted '${WORKSPACE_ENTRY}' at position ${INSERT_AT} (after its monorepo deps)."
    fi
fi

# 6a. Refresh the new package's LICENSE/TRADEMARK from the monorepo root so it
# matches every other workspace. Runs after step 6 because update-legal
# resolves the target via `npm query .workspace`, which needs the new entry
# to already be in the root workspaces array.
echo "==> Refreshing LICENSE/TRADEMARK from monorepo root..."
npm run update-legal -- "${NPM_ORGANIZATION}/${REPO_NAME}"

# 7. Rewire inter-package dependencies across all packages.
echo "==> Rewiring inter-package dependencies..."

ALL_PACKAGES=$(get_existing_packages)

# For every package in the monorepo (existing + the new one), find any dep that
# names another monorepo package and rewrite it to use the @scratch/-prefixed
# name pinned to that workspace's current version (e.g.
# "@scratch/scratch-vm": "13.7.2"). Pinning to the exact workspace version
# ensures npm resolves to the local workspace rather than a higher published
# registry version.
#
# Two cases are handled:
#   1. Bare-name keys (e.g. "scratch-vm": "...") — checked in every package,
#      since an existing package may still reference the newly-added repo by
#      bare name from before its import.
#   2. Already @scratch/-prefixed keys with a stale exact version (e.g.
#      "@scratch/scratch-svg-renderer": "13.7.3") — only inside the newly-added
#      package, where the source repo may have shipped its cross-deps pre-
#      prefixed and pinned to whatever was the latest registry release at
#      import time.
#
# Already-@scratch/-prefixed keys in OTHER packages are left as-is to avoid
# opportunistic rewrites of unrelated packages.
#
# After rewriting, each affected dep section is sorted alphabetically by key,
# matching what `npm install --save` produces.
#
# npm's workspace: protocol would be the ideal here ("resolve to the workspace,
# substitute the actual version at publish"), but npm does not actually support
# it (npm/cli#8845 — EUNSUPPORTEDPROTOCOL at install time), so exact-pin matches
# the existing scratch-gui / scratch-vm / scratch-render convention.

# Build a JSON array of rewrite rules: [{matchKeys, target, version}, ...].
# The "new package" variant lists both the bare and the @scratch/-prefixed
# form in matchKeys so the new package's pre-prefixed-but-stale pins get
# repinned to the local workspace version too.
build_rewrites_json() {
    local include_full="$1"
    local result='[]'
    local dep ver full match_keys
    for dep in $ALL_PACKAGES; do
        ver=$(jq -r '.version' "${MONOREPO_ROOT}/packages/${dep}/package.json")
        full="${NPM_ORGANIZATION}/${dep}"
        if [ "$include_full" = "true" ]; then
            match_keys=$(jq -cn --arg b "$dep" --arg f "$full" '[$b, $f]')
        else
            match_keys=$(jq -cn --arg b "$dep" '[$b]')
        fi
        result=$(jq -c --argjson mk "$match_keys" --arg t "$full" --arg v "$ver" \
            '. + [{matchKeys: $mk, target: $t, version: $v}]' <<< "$result")
    done
    printf '%s' "$result"
}

REWRITES_NEW_PKG=$(build_rewrites_json true)
REWRITES_OTHER_PKG=$(build_rewrites_json false)

# Single-pass filter applied to each package.json: walks every dependency-
# shaped section, rewrites matching keys (or array entries for the bundle
# spellings) to their @scoped equivalents pinned to the local workspace
# version, and sorts each section.
#
# Object sections (dependencies, devDependencies, peerDependencies,
# optionalDependencies) are sorted by key; the bundle arrays
# (bundleDependencies and its legacy spelling bundledDependencies) are
# sorted and uniqued, since they're a set of names with no associated
# version.
#
# If rewriting an object section produces duplicate keys (e.g. a package.json
# lists both "scratch-foo" and "@scratch/scratch-foo"), the filter errors
# out naming the section and the colliding key. That state shouldn't occur
# in practice, and silently merging it would let stale pins win over the
# freshly-rewritten workspace version.
# shellcheck disable=SC2016
# $rewrites below is a jq variable bound via --argjson, not a shell expansion.
REWRITE_FILTER='
def rewriteSection($rewrites; $section):
    if type == "object" then
        to_entries
        | map(. as $e
              | ($rewrites | map(select(.matchKeys | index($e.key))) | first) as $hit
              | if $hit then {key: $hit.target, value: $hit.version} else $e end)
        | . as $entries
        | ($entries | group_by(.key) | map(select(length > 1) | .[0].key)) as $dups
        | if ($dups | length) > 0 then
              error("duplicate keys in \($section) after rewrite: \($dups | join(", "))")
          else
              $entries | sort_by(.key) | from_entries
          end
    elif type == "array" then
        map(. as $name
            | ($rewrites | map(select(.matchKeys | index($name))) | first) as $hit
            | if $hit then $hit.target else $name end)
        | unique
    else .
    end;

reduce (
    "dependencies", "devDependencies", "peerDependencies", "optionalDependencies",
    "bundleDependencies", "bundledDependencies"
) as $k (.;
    if .[$k] then .[$k] |= rewriteSection($rewrites; $k) else . end
)
'

for PACKAGE in $ALL_PACKAGES; do
    PACKAGE_JSON="${MONOREPO_ROOT}/packages/${PACKAGE}/package.json"
    if [ ! -r "$PACKAGE_JSON" ]; then
        continue
    fi

    if [ "$PACKAGE" = "$REPO_NAME" ]; then
        REWRITES="$REWRITES_NEW_PKG"
    else
        REWRITES="$REWRITES_OTHER_PKG"
    fi

    if ! jq_in_place "$PACKAGE_JSON" --argjson rewrites "$REWRITES" "$REWRITE_FILTER"; then
        package_replacement_error "$PACKAGE" "monorepo refs"
    fi
done

# Rewrite require/import references for the new repo across the whole monorepo.
# Using perl for cross-platform in-place editing (sed -i differs between BSD and GNU).
echo "==> Updating require/import references for ${REPO_NAME}..."

# Collect matching files with a read loop rather than `mapfile` so the script
# works under bash 3.2 (the version macOS ships at /bin/bash).
MATCHING_FILES=()
while IFS= read -r f; do
    MATCHING_FILES+=("$f")
done < <(
    find "${MONOREPO_ROOT}" -type f \
        -not -path '*/.git/*' \
        -not -path '*/node_modules/*' \
        -exec grep -Il "$REPO_NAME" {} + 2>/dev/null
)

if [ ${#MATCHING_FILES[@]} -gt 0 ]; then
    REPO_NAME="$REPO_NAME" NPM_ORG="$NPM_ORGANIZATION" perl -i -pe '
        BEGIN { $r = $ENV{REPO_NAME}; $n = $ENV{NPM_ORG}; }
        s{(require\(|from\s|resolve\(|node_modules)([\047"/])\Q$r\E([\047"/])}{$1$2$n/$r$3}g
    ' "${MATCHING_FILES[@]}"
fi

# 8. Normalize the lockfile after all the dep changes.
echo "==> Normalizing package-lock.json..."
npm install --package-lock-only --prefer-offline --no-audit --no-fund
npm install --prefer-offline --no-audit --no-fund

# 9. Commit the integration fixups as one cumulative commit.
echo "==> Committing fixup changes..."
git add -A
if ! git diff --cached --quiet; then
    git commit -m "feat: integrate ${REPO_NAME} into monorepo

- Renamed package to ${NPM_ORGANIZATION}/${REPO_NAME}
- Removed standalone-repo metadata (CI/release configs, hooks, repo-level dotfiles)
- Refreshed LICENSE/TRADEMARK from monorepo root
- Rewired inter-package dependencies to use workspace versions
- Added to root workspaces list
- Regenerated package-lock.json"
else
    echo "    No fixup changes to commit."
fi

# 10. Regenerate CI workflows (default; --no-ci to skip).
if [ "$SKIP_CI" = false ]; then
    echo "==> Regenerating CI workflows..."
    npm run refresh-gh-workflow

    git add -A
    if ! git diff --cached --quiet; then
        git commit -m "ci: regenerate workflows after adding ${REPO_NAME}"
    else
        echo "    No CI workflow changes to commit."
    fi
else
    echo "==> Skipping CI workflow regeneration (--no-ci)."
    echo "    Run 'npm run refresh-gh-workflow' manually when ready."
fi

### Done ###

echo ""
echo "=========================================="
echo "  Successfully added ${REPO_NAME}!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Merged ${REPO_NAME}#${SOURCE_BRANCH} into ${CURRENT_BRANCH}"
echo "  - Package location: ${PACKAGE_DIR}/"
echo "  - Package name:     ${NPM_ORGANIZATION}/${REPO_NAME}"
echo ""
echo "Recommended next steps:"
echo "  1. Review the commits:    git log --oneline -10"
echo "  2. Verify the package:    ls ${PACKAGE_DIR}/"
echo "  3. Check workspace resolution:  npm ls ${NPM_ORGANIZATION}/${REPO_NAME}"
echo "  4. Review generated CI changes:"
echo "       .github/path-filters.yml"
echo "       .github/workflows/publish.yml"
echo "  5. Run tests:             npm test -w ${NPM_ORGANIZATION}/${REPO_NAME}"
echo "  6. If the new package's position in 'workspaces' is wrong for build order,"
echo "     reorder it manually in the root package.json."
echo ""
