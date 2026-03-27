#!/bin/bash

# add-repo.sh — Add an existing GitHub repository into the scratch-editor monorepo.
#
# This script imports a single repo with full git history into the current monorepo
# checkout. It rewrites the source repo's history so all files live under
# packages/<repo-name>/, merges it into the current branch, rewires inter-package
# dependencies, updates the root workspaces list, and regenerates CI workflows.
#
# Prerequisites:
#   - git-filter-repo   (brew install git-filter-repo)
#   - sponge            (brew install moreutils)
#   - jq                (brew install jq)
#
# Usage:
#   ./scripts/add-repo.sh <repo-name> [options]
#
# Options:
#   --source-branch <branch>   Branch to import from the source repo (default: auto-detect)
#   --org <github-org>         GitHub organization (default: scratchfoundation)
#   --cache-dir <path>         Local cache dir containing a clone of the repo (default: ./..)
#   --no-ci                    Skip CI workflow regeneration
#   --help                     Show this help message
#
# Examples:
#   ./scripts/add-repo.sh scratch-audio
#   ./scripts/add-repo.sh scratch-storage --source-branch develop
#   ./scripts/add-repo.sh scratch-paint --org myfork --cache-dir ~/GitHub

set -e

### Defaults ###

GITHUB_ORG="scratchfoundation"
MONOREPO_URL="https://github.com/scratchfoundation/scratch-editor.git"
NPM_ORGANIZATION="@scratch"
BUILD_CACHE="./.."
BUILD_TMP="./add-repo.tmp"
SOURCE_BRANCH="develop"
SKIP_CI=false

### Argument parsing ###

usage() {
    sed -n '/^# Usage:/,/^[^#]/{ /^#/s/^# \{0,1\}//p; }' "$0"
    exit "${1:-0}"
}

REPO_NAME=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source-branch)
            SOURCE_BRANCH="$2"
            shift 2
            ;;
        --org)
            GITHUB_ORG="$2"
            shift 2
            ;;
        --cache-dir)
            BUILD_CACHE="$2"
            shift 2
            ;;
        --no-ci)
            SKIP_CI=true
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

MONOREPO_ROOT="$(git rev-parse --show-toplevel)"
PACKAGE_DIR="packages/${REPO_NAME}"
PACKAGE_PATH="${MONOREPO_ROOT}/${PACKAGE_DIR}"

### Prerequisite checks ###

echo "==> Checking prerequisites..."

if ! git filter-repo -h &> /dev/null; then
    echo "Error: Please install git-filter-repo. You can try with:" >&2
    echo "- brew install git-filter-repo" >&2
    echo "- sudo apt install git-filter-repo" >&2
    exit 1
fi

if ! command -v sponge &> /dev/null; then
    echo "Error: Please install the 'sponge' command. You can try with:" >&2
    echo "- brew install moreutils" >&2
    echo "- sudo apt install moreutils" >&2
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: Please install jq. You can try with:" >&2
    echo "- brew install jq" >&2
    echo "- sudo apt install jq" >&2
    exit 1
fi

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

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "    Monorepo root:    ${MONOREPO_ROOT}"
echo "    Current branch:   ${CURRENT_BRANCH}"
echo "    Target package:   ${PACKAGE_DIR}"
echo "    GitHub org:       ${GITHUB_ORG}"
echo "    Source repo:      ${GITHUB_ORG}/${REPO_NAME}"

### Helper functions (adapted from build-monorepo.sh) ###

# Thanks to https://stackoverflow.com/a/17841619
join_args() {
    local d=${1-} f=${2-}
    if shift 2; then
        printf %s "$f" "${@/#/$d}"
    fi
}

# Clone a repository into BUILD_TMP as a bare repo
# Uses a local cache directory for speed if available
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
        echo "    No local cache found, cloning directly from GitHub..."
        git -C "$BUILD_TMP" clone --bare "git@github.com:${org_and_repo}.git" "${repo}"
    fi

    # Disconnect from the reference repo
    git -C "${BUILD_TMP}/${repo}" repack -a
    rm -f "${BUILD_TMP}/${repo}/.git/objects/info/alternates"
}

# Rewrite all paths in the cloned repo to live under a subdirectory
# Handles repos with and without submodules
move_repository_subdirectory() {
    local repo="$1"
    local subdirectory="$2"

    echo "==> Rewriting history to move files under ${subdirectory}..."

    # Make filter-repo accept this as a fresh clone
    git -C "${BUILD_TMP}/${repo}" gc

    local has_submodules
    has_submodules=$(
        git -C "${BUILD_TMP}/${repo}" branch --format="%(refname:short)" | while read branch; do
            if git -C "${BUILD_TMP}/${repo}" cat-file -e "${branch}:.gitmodules" &> /dev/null; then
                echo "yep"
                break
            fi
        done
    )

    # rewrite history as if all this work happened in a subdirectory
    # "git mv" is simpler but makes history much less visible
    if [ "$has_submodules" != "yep" ]; then
        echo "    Repository does NOT have submodules"
        git -C "${BUILD_TMP}/${repo}" filter-repo --to-subdirectory-filter "$subdirectory"
    else
        echo "    Repository DOES have submodules"
        # the .gitmodules file must stay in the repository root, but the paths inside it must be rewritten
        # this is complicated for the reasons described here: https://github.com/newren/git-filter-repo/issues/158
        # this is also slower, so we only do it for repositories that have submodules
        # if we have more than one, this will cause merge conflicts
        git -C "${BUILD_TMP}/${repo}" filter-repo \
            --filename-callback "return filename if filename == b'.gitmodules' else b'${subdirectory}'+filename" \
            --blob-callback "if blob.data.startswith(b'[submodule '): blob.data = blob.data.replace(b'path = ', b'path = ${subdirectory}')"
    fi
}

# Get the list of existing monorepo workspace package names (without @scratch/ prefix)
# e.g. "scratch-gui scratch-vm scratch-render scratch-svg-renderer"
get_existing_packages() {
    jq -r '.workspaces[]' "${MONOREPO_ROOT}/package.json" | sed 's|packages/||'
}

# Report that replacing a dependency with the local monorepo version failed
# $1: the name of the repository
# $2: the branch that was being built
# $3: the dependency that failed to install
package_replacement_error () {
    echo "***ERROR***"
    echo "Could not replace a dependency with the local monorepo version."
    echo "Failed to replace $3 in $1#$2" | tee -a "monorepo.errors.log"
    #exit 1 # uncomment this to make it a fatal error
    echo "Attempting to continue anyway..."
}

### Step 1: Clone and rewrite history ###

echo ""
echo "=========================================="
echo "  Adding ${REPO_NAME} to the monorepo"
echo "=========================================="
echo ""

clone_repository "$REPO_NAME"

move_repository_subdirectory "$REPO_NAME" "${PACKAGE_DIR}/"

### Step 2: Verify source branch ###

if [ -z "$(git -C "${BUILD_TMP}/${REPO_NAME}" branch --list "$SOURCE_BRANCH")" ]; then
    echo "Error: Branch '${SOURCE_BRANCH}' not found in ${REPO_NAME}." >&2
    echo "Available branches:" >&2
    git -C "${BUILD_TMP}/${REPO_NAME}" branch --list | sed 's/^/  /' >&2
    rm -rf "$BUILD_TMP"
    exit 1
fi
echo "==> Using specified source branch: ${SOURCE_BRANCH}"

### Step 3: Merge into current branch ###

echo "==> Merging ${REPO_NAME}#${SOURCE_BRANCH} into ${CURRENT_BRANCH}..."

REMOTE_NAME="temp-${REPO_NAME}"
git remote add "$REMOTE_NAME" "$(realpath "${BUILD_TMP}")/${REPO_NAME}"
git fetch --no-tags "$REMOTE_NAME"

MERGE_MESSAGE="feat: add ${REPO_NAME}#${SOURCE_BRANCH} as ${PACKAGE_DIR}"
git merge --no-ff --allow-unrelated-histories "${REMOTE_NAME}/${SOURCE_BRANCH}" -m "$MERGE_MESSAGE"

git remote remove "$REMOTE_NAME"

echo "    Merge complete."

# Clean up the temporary clone now — before any `git add -A` can accidentally stage it
echo "==> Cleaning up temporary clone..."
rm -rf "$BUILD_TMP"

### Step 4: Fixup the new package ###

echo "==> Fixing up ${PACKAGE_DIR}/package.json..."

# remove repository-level configuration and dependencies, like Renovate and Husky
# do not remove configuration and dependencies that could vary between packages, like semantic-release
# do not remove content like .github/ that may be useful as reference when building the monorepo equivalent
# it would be nice to merge all the package-lock.json files into one but it's not clear how to do that
# just remove the package-lock.json files for now, and build a new one with "npm i" later
rm -rf "${PACKAGE_PATH}/.husky" \
       "${PACKAGE_PATH}/package-lock.json" \
       "${PACKAGE_PATH}/renovate.json" \
       "${PACKAGE_PATH}/renovate.json5"

# Rewrite package.json: rename package, set monorepo URL, strip Husky/commitlint config
if [ -r "${PACKAGE_PATH}/package.json" ]; then
    jq -f --arg PACKAGE_NAME "${NPM_ORGANIZATION}/${REPO_NAME}" \
          --arg MONOREPO_URL "$MONOREPO_URL" \
        <(join_args ' | ' \
            '.name |= $PACKAGE_NAME' \
            '.repository.url |= $MONOREPO_URL' \
            'if .scripts.prepare == "husky install" then del(.scripts.prepare) else . end' \
            'if .scripts == {} then del(.scripts.prepare) else . end' \
            'del(.config.commitizen)' \
            'if .config == {} then del(.config) else . end' \
            'del(.devDependencies."@commitlint/cli")' \
            'del(.devDependencies."@commitlint/config-conventional")' \
            'del(.devDependencies."@commitlint/travis-cli")' \
            'del(.devDependencies."cz-conventional-changelog")' \
            'del(.devDependencies."husky")' \
            'if .devDependencies == {} then del(.devDependencies) else . end' \
        ) "${PACKAGE_PATH}/package.json" | sponge "${PACKAGE_PATH}/package.json"
fi

### Step 5: Update root workspaces list ###

echo "==> Updating root package.json workspaces..."

# Add the new package to the workspaces array BEFORE rewiring dependencies,
# so npm can resolve it as a local workspace package rather than fetching from the registry.
# NOTE: This prepends it to the beginning so it is built before packages that depend on it.
WORKSPACE_ENTRY="packages/${REPO_NAME}"
if ! jq -e ".workspaces | index(\"${WORKSPACE_ENTRY}\")" "${MONOREPO_ROOT}/package.json" > /dev/null 2>&1; then
    jq ".workspaces |= [\"${WORKSPACE_ENTRY}\"] + ." "${MONOREPO_ROOT}/package.json" \
        | sponge "${MONOREPO_ROOT}/package.json"
    echo "    Added '${WORKSPACE_ENTRY}' to workspaces."
else
    echo "    '${WORKSPACE_ENTRY}' already in workspaces."
fi

### Step 6: Rewire inter-package dependencies ###

echo "==> Rewiring inter-package dependencies..."

# Collect all monorepo packages: existing ones + the newly added one
EXISTING_PACKAGES=$(get_existing_packages)
ALL_PACKAGES="${EXISTING_PACKAGES} ${REPO_NAME}"

# For the newly added package, replace deps pointing to other monorepo packages
# Also check existing packages for deps pointing to the newly added repo
for PACKAGE in $ALL_PACKAGES; do
    PACKAGE_JSON="${MONOREPO_ROOT}/packages/${PACKAGE}/package.json"

    if [ ! -r "$PACKAGE_JSON" ]; then
        continue
    fi

    DEPS=""
    DEVDEPS=""
    OPTDEPS=""
    PEERDEPS=""

    for DEP in $ALL_PACKAGES; do
        # Check each dependency type for references to other monorepo packages by their
        # un-prefixed name (e.g. "scratch-vm" instead of "@scratch/scratch-vm")
        if jq -e ".dependencies.\"${DEP}\"" "$PACKAGE_JSON" > /dev/null 2>&1; then
            jq "del(.dependencies.\"${DEP}\")" "$PACKAGE_JSON" | sponge "$PACKAGE_JSON"
            DEPS="$DEPS ${DEP}@*"
        fi
        if jq -e ".devDependencies.\"${DEP}\"" "$PACKAGE_JSON" > /dev/null 2>&1; then
            jq "del(.devDependencies.\"${DEP}\")" "$PACKAGE_JSON" | sponge "$PACKAGE_JSON"
            DEVDEPS="$DEVDEPS ${DEP}@*"
        fi
        if jq -e ".optionalDependencies.\"${DEP}\"" "$PACKAGE_JSON" > /dev/null 2>&1; then
            jq "del(.optionalDependencies.\"${DEP}\")" "$PACKAGE_JSON" | sponge "$PACKAGE_JSON"
            OPTDEPS="$OPTDEPS ${DEP}@*"
        fi
        if jq -e ".peerDependencies.\"${DEP}\"" "$PACKAGE_JSON" > /dev/null 2>&1; then
            jq "del(.peerDependencies.\"${DEP}\")" "$PACKAGE_JSON" | sponge "$PACKAGE_JSON"
            PEERDEPS="$PEERDEPS ${DEP}@*"
        fi
    done

    # Re-add as workspace dependencies with the @scratch/ prefix
    for DEP in $DEPS; do
        npm install --force --save --save-exact \
            "${NPM_ORGANIZATION}/${DEP}" -w "${NPM_ORGANIZATION}/${PACKAGE}" \
            || package_replacement_error "$PACKAGE" "$DEP"
    done
    for DEP in $DEVDEPS; do
        npm install --force --save-dev --save-exact \
            "${NPM_ORGANIZATION}/${DEP}" -w "${NPM_ORGANIZATION}/${PACKAGE}" \
            || package_replacement_error "$PACKAGE" "$DEP"
    done
    for DEP in $OPTDEPS; do
        npm install --force --save-optional --save-exact \
            "${NPM_ORGANIZATION}/${DEP}" -w "${NPM_ORGANIZATION}/${PACKAGE}" \
            || package_replacement_error "$PACKAGE" "$DEP"
    done
    for DEP in $PEERDEPS; do
        npm install --force --save-peer --save-exact \
            "${NPM_ORGANIZATION}/${DEP}" -w "${NPM_ORGANIZATION}/${PACKAGE}" \
            || package_replacement_error "$PACKAGE" "$DEP"
    done
done

# Replace require/import references to the new repo's un-prefixed name across the codebase
echo "==> Updating require/import references for ${REPO_NAME}..."
find "${MONOREPO_ROOT}" -type f \
    -not -path '*/.git/*' \
    -not -path '*/node_modules/*' \
    -exec grep -Il "$REPO_NAME" {} \; 2>/dev/null | while read -r file; do
    sed -i '' -e "s:\(require(\|from \|resolve(\|node_modules\)\(['\"/]\)${REPO_NAME}\(['\"/]\):\1\2${NPM_ORGANIZATION}/${REPO_NAME}\3:g" "$file"
done

# Also update references in existing packages that point to the new repo
# (These are require/import statements in files that were already in the monorepo)

### Step 7: Install dependencies ###

echo "==> Running npm install..."

npm install --prefer-offline --no-audit --no-fund
npm install --package-lock-only 2>/dev/null || true  # normalize package-lock.json

### Step 8: Commit fixup changes ###

echo "==> Committing fixup changes..."

git add -A
if ! git diff --cached --quiet; then
    git commit -m "feat: integrate ${REPO_NAME} into monorepo

- Renamed package to ${NPM_ORGANIZATION}/${REPO_NAME}
- Removed repo-level config (.husky, renovate, commitlint)
- Rewired inter-package dependencies to use workspace versions
- Added to root workspaces list
- Regenerated package-lock.json"
else
    echo "    No fixup changes to commit."
fi

### Step 9: Regenerate CI workflows ###

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

### Step 10: Done ###

echo ""
echo "=========================================="
echo "  Successfully added ${REPO_NAME}!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Merged ${REPO_NAME}#${SOURCE_BRANCH} into ${CURRENT_BRANCH}"
echo "  - Package location: ${PACKAGE_DIR}/"
echo "  - Package name: ${NPM_ORGANIZATION}/${REPO_NAME}"
echo ""
echo "Recommended next steps:"
echo "  1. Review the merge commits: git log --oneline -10"
echo "  2. Verify the package: ls ${PACKAGE_DIR}/"
echo "  3. Check workspace resolution: npm ls ${NPM_ORGANIZATION}/${REPO_NAME}"
echo "  4. Review generated CI changes:"
echo "     .github/path-filters.yml"
echo "     .github/workflows/publish.yml"
echo "  5. Run tests: npm test -w ${NPM_ORGANIZATION}/${REPO_NAME}"
echo ""
