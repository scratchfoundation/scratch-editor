#!/bin/bash

### Configuration ###

# All repositories are assumed to be hosted in this GitHub org
GITHUB_ORG="scratchfoundation"

# This is the list of repositories to merge into the monorepo
# Current thinking: this should be all Scratch Editor repos excluding forks
ALL_REPOS="
    scratch-gui \
    scratch-render \
    scratch-svg-renderer \
    scratch-vm \
"

DEST_BRANCHES="
    develop \
    scratch-android \
    scratch-desktop \
"
#ALL_REPOS="scratch-audio \
#     scratch-desktop \
#     scratch-gui \
#     scratch-l10n \
#     scratch-paint \
#     scratch-parser \
#     scratch-render \
#     scratch-sb1-converter \
#     scratch-semantic-release-config \
#     scratch-storage \
#     scratch-svg-renderer \
#     scratch-translate-extension-languages \
#     scratch-vm \
#     eslint-config-scratch \
# "

# This is the directory where you have a copy of all the repositories you want to merge.
# This script will run `git fetch` on these repos, but otherwise will not modify them.
BUILD_CACHE="./.."

# The monorepo will be built here. Delete it to start over.
BUILD_OUT="./monorepo.out"

# Temporary clones will be placed here. If the script completes successfully, this directory will be deleted.
BUILD_TMP="./monorepo.tmp"

# Use ${BASE_COMMIT} from ${BASE_REPO} as the starting point for the monorepo.
BASE_COMMIT="$(git rev-parse develop)"
BASE_REPO="scratch-editor"
MONOREPO_URL="https://github.com/scratchfoundation/scratch-editor.git"

# Limit the threads and memory used by git repack & git gc. This script only uses these values in final optimization.
# If you see "error: pack-objects died of signal 9" or an out-of-memory error, try reducing one or both.
# In my experiments, the maximum memory used was around 2.2 * GIT_PACK_THREADS * GIT_PACK_WINDOW_MEMORY.
# Values above 512m did not seem to improve compression in my tests. The cutoff is somewhere between 256m and 512m.
# See git documentation for pack.threads and pack.windowMemory for more information.
# Increasing threads speeds up the operation, but uses more CPU and memory.
# Increasing windowMemory may compress the .git directory better, but takes more time and uses more memory.
# Setting threads to zero will tell git to detect your CPU count.
# Setting window memory to zero will remove the limit.
# WARNING: on some configurations, window memory is stored in a signed 32-bit integer, so the maximum value is ~2047m.
GIT_PACK_THREADS="8"
GIT_PACK_WINDOW_MEMORY="512m"

# Options to speed up `npm install` during the fixup phase
NPM_QUICK_OPTS="--prefer-offline --no-audit --no-fund"

### End configuration ###

set -e

if ! git filter-repo -h &> /dev/null; then
    echo "Please install git-filter-repo. One of these commands might work:"
    echo "- brew install git-filter-repo"
    echo "- sudo apt install git-filter-repo"
    exit 1
fi

if ! sponge --help &> /dev/null; then
    echo "Please install the 'sponge' command."
    echo "You may want: sudo apt install moreutils"
    exit 1
fi

if [ ! -d "$BUILD_CACHE" ]; then
    echo "Please link $BUILD_CACHE to a directory with a copy of all the repositories you want to merge."
    echo "For example, if you have ~/GitHub/scratch-audio, ~/GitHub/scratch-blocks, etc., then run:"
    echo "ln -s ~/GitHub $BUILD_CACHE"
    exit 1
fi

if [ -d "$BUILD_TMP" ]; then
    echo "Please remove $BUILD_TMP before running this script."
    echo "You may want: rm -rf $BUILD_TMP $BUILD_OUT"
    exit 1
fi

if [ -d "$BUILD_OUT" ]; then
    echo "Please remove $BUILD_OUT before running this script."
    echo "You may want: rm -rf $BUILD_TMP $BUILD_OUT"
    exit 1
fi

# Thanks to https://stackoverflow.com/a/17841619
join_args () {
    local d=${1-} f=${2-}
    if shift 2; then
        printf %s "$f" "${@/#/$d}"
    fi
}

init_monorepo () {
    git init "$BUILD_OUT"
    git -C "$BUILD_OUT" remote add origin "git@github.com:${GITHUB_ORG}/${BASE_REPO}.git"
    git -C "$BUILD_OUT" fetch --all # to make sure BASE_COMMIT is available
}

add_repo_to_monorepo () {
    REPO_NAME="$1"
    ORG_AND_REPO_NAME="${GITHUB_ORG}/${REPO_NAME}"
    echo "Working on $ORG_AND_REPO_NAME"

    clone_repository $REPO_NAME

    move_repository_subdirectory $REPO_NAME "packages/${REPO_NAME}"

    #
    # Merge branches in
    #

    REMOTE_NAME="temp-$REPO_NAME"
    git -C "$BUILD_OUT" remote add "$REMOTE_NAME" "$(realpath "${BUILD_TMP}")/${REPO_NAME}"
    git -C "$BUILD_OUT" fetch --no-tags "$REMOTE_NAME"

    for DEST_BRANCH in $DEST_BRANCHES; do
        BRANCH=""
        case "$DEST_BRANCH" in
            develop|main)
                if [ -z "$(git -C "${BUILD_TMP}/${REPO_NAME}" branch --list "$DEST_BRANCH")" ]; then
                    BRANCH=$(default_branch)
                else
                    BRANCH="$DEST_BRANCH"
                fi
                ;;
            scratch-android)
                if [ "$REPO_NAME" = "scratch-gui" ]; then
                    BRANCH="native"
                elif [ "$(git -C "${BUILD_TMP}/${REPO_NAME}" branch --list "develop")" ]; then
                    BRANCH="develop"
                else
                    BRANCH=$(default_branch)
                fi
                ;;
            scratch-desktop)
                if [ "$REPO_NAME" = "scratch-gui" ]; then
                    BRANCH="$DEST_BRANCH"
                elif [ "$(git -C "${BUILD_TMP}/${REPO_NAME}" branch --list "develop")" ]; then
                    BRANCH="develop"
                else
                    BRANCH=$(default_branch)
                fi
                ;;
        esac

        # checkout needs `-f` to get past CRLF problems
        if [ -z "$(git -C "$BUILD_OUT" branch --list "$DEST_BRANCH")" ]; then
            # create the destination branch if it doesn't exist
            git -C "$BUILD_OUT" checkout -f --no-guess -b "$DEST_BRANCH" "$BASE_COMMIT"
        else
            # switch to existing branch
            git -C "$BUILD_OUT" checkout -f --no-guess "$DEST_BRANCH"
        fi

        MERGE_MESSAGE="chore(deps): add ${REPO_NAME}#${BRANCH} as packages/${REPO_NAME}"
        git -C "$BUILD_OUT" merge --no-ff --allow-unrelated-histories "${REMOTE_NAME}/${BRANCH}" -m "$MERGE_MESSAGE"
    done

    git -C "$BUILD_OUT" remote remove "$REMOTE_NAME"
    rm -rf "${BUILD_TMP}/${REPO_NAME}"
}

add_gh_pages () {
    REPO_NAME="$1"
    ORG_AND_REPO_NAME="${GITHUB_ORG}/${REPO_NAME}"
    echo "Working on $ORG_AND_REPO_NAME"

    GH_PAGES_BRANCH="gh-pages"

    clone_repository $REPO_NAME

    move_repository_subdirectory $REPO_NAME "${REPO_NAME}/"

    #
    # Merge branches in
    #

    REMOTE_NAME="temp-$REPO_NAME"
    git -C "$BUILD_OUT" remote add "$REMOTE_NAME" "$(realpath "${BUILD_TMP}")/${REPO_NAME}"
    git -C "$BUILD_OUT" fetch --no-tags "$REMOTE_NAME"

    if [ -z "$(git -C "$BUILD_OUT" branch --list "$GH_PAGES_BRANCH")" ]; then
        # create the destination branch if it doesn't exist
        git -C "$BUILD_OUT" symbolic-ref HEAD "refs/heads/${GH_PAGES_BRANCH}"
        rm -rf "${BUILD_OUT}/.git/index"
        git -C "$BUILD_OUT" clean -fdx
        git -C "$BUILD_OUT" checkout develop .gitignore
        git -C "$BUILD_OUT" add .
        git -C "$BUILD_OUT" commit --allow-empty -m "Initial commit for github pages"
    else
        # switch to existing branch
        git -C "$BUILD_OUT" checkout -f --no-guess "$GH_PAGES_BRANCH"
    fi

    MERGE_MESSAGE="chore(deps): add ${REPO_NAME}#${GH_PAGES_BRANCH} as ${REPO_NAME}"
    git -C "$BUILD_OUT" merge --no-ff --allow-unrelated-histories "${REMOTE_NAME}/${GH_PAGES_BRANCH}" -m "$MERGE_MESSAGE"

    git -C "$BUILD_OUT" remote remove "$REMOTE_NAME"
    rm -rf "${BUILD_TMP}/${REPO_NAME}"
}

# Repack the local git repository to save space, for example 4.4 GB -> 3.1GB.
# This does not affect the remote repository, so if local size is not a major concern, you can skip this step.
optimize_git_repo () {
    du -sh "$BUILD_OUT"
    #git -C "$BUILD_OUT" -c pack.threads="$GIT_PACK_THREADS" -c pack.windowMemory="$GIT_PACK_WINDOW_MEMORY" gc --prune=now --aggressive
    #du -sh "$BUILD_OUT"
}

clone_repository() {
    REPO_NAME="$1"
    ORG_AND_REPO_NAME="${GITHUB_ORG}/${REPO_NAME}"

    #
    # Clone
    #

    # refresh the cache
    git -C "${BUILD_CACHE}/${REPO_NAME}" fetch --all
    # reference = go faster
    git -C "$BUILD_TMP" clone --bare --dissociate --reference "$(realpath "$BUILD_CACHE")/${REPO_NAME}" "git@github.com:${ORG_AND_REPO_NAME}.git" "${REPO_NAME}"
    # get ready to disconnect reference repo
    git -C "${BUILD_TMP}/${REPO_NAME}" repack -a
    # actually disconnect the reference repo
    rm -f "${BUILD_TMP}/${REPO_NAME}/.git/objects/info/alternates"
}

move_repository_subdirectory() {
    REPO_NAME="$1"
    SUBDIRECTORY="$2"

    #
    # Move to subdirectory
    #

    # make filter-repo accept this as a fresh clone
    git -C "${BUILD_TMP}/${REPO_NAME}" gc

    HAS_SUBMODULES=$(
        git -C "${BUILD_TMP}/${REPO_NAME}" branch --format="%(refname:short)" | while read BRANCH; do
            if git -C "${BUILD_TMP}/${REPO_NAME}" cat-file -e "${BRANCH}:.gitmodules" &> /dev/null; then
                echo "yep"
                break;
            fi
        done
    )

    # rewrite history as if all this work happened in a subdirectory
    # "git mv" is simpler but makes history much less visible
    if [ "$HAS_SUBMODULES" != "yep" ]; then
        echo "Repository ${REPO_NAME} does NOT have submodules"
        # this is significantly faster than the special case below
        git -C "${BUILD_TMP}/${REPO_NAME}" filter-repo --to-subdirectory-filter $SUBDIRECTORY
    else
        echo "Repository ${REPO_NAME} DOES have submodules"
        # the .gitmodules file must stay in the repository root, but the paths inside it must be rewritten
        # this is complicated for the reasons described here: https://github.com/newren/git-filter-repo/issues/158
        # this is also slower, so we only do it for repositories that have submodules
        # if we have more than one, this will cause merge conflicts
        git -C "${BUILD_TMP}/${REPO_NAME}" filter-repo \
            --filename-callback "return filename if filename == b'.gitmodules' else b'${SUBDIRECTORY}'+filename" \
            --blob-callback "if blob.data.startswith(b'[submodule '): blob.data = blob.data.replace(b'path = ', b'path = ${SUBDIRECTORY}')"
    fi
}

default_branch () {
    BRANCH="master"

    if [ -z "$(git -C "${BUILD_TMP}/${REPO_NAME}" branch --list "$BRANCH")" ]; then
        BRANCH="main"

        if [ -z "$(git -C "${BUILD_TMP}/${REPO_NAME}" branch --list "$BRANCH")" ]; then
            BRANCH="develop"
        fi
    fi

    echo "$BRANCH"
}

# Perform monorepo fixups on a branch.
# Mostly: remove "global" files from subdirectories and localize dependencies.
#   $1: the name of the branch to fix up
fixup_branch () {
    BRANCH="$1"
    NPM_ORGANIZATION="@scratch"

    git -C "$BUILD_OUT" checkout -f --no-guess "$BRANCH"

    # submodules could be necessary for build/test scripts
    git -C "$BUILD_OUT" submodule update --init --recursive

    # remove repository-level configuration and dependencies, like Renovate and Husky
    # do not remove configuration and dependencies that could vary between packages, like semantic-release
    # do not remove content like .github/ that may be useful as reference when building the monorepo equivalent
    # it would be nice to merge all the package-lock.json files into one but it's not clear how to do that
    # just remove the package-lock.json files for now, and build a new one with "npm i" later
    rm -rf "$BUILD_OUT"/packages/*/{.husky,package-lock.json,renovate.json*}
    for REPO in $ALL_REPOS; do
        if [ ! -r "${BUILD_OUT}/packages/${REPO}/package.json" ]; then
            # This repository doesn't exist in this branch
            continue
        fi

        jq -f --arg PACKAGE_NAME "$NPM_ORGANIZATION/$REPO" --arg MONOREPO_URL "$MONOREPO_URL" <(join_args ' | ' \
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
        ) "${BUILD_OUT}/packages/${REPO}/package.json" | sponge "${BUILD_OUT}/packages/${REPO}/package.json"
    done
    git -C "$BUILD_OUT" commit -m "chore: remove repo-level configuration and deps from packages/*" \
        packages

    npm -C "$BUILD_OUT" i

    for REPO in $ALL_REPOS; do
        if [ ! -r "${BUILD_OUT}/packages/${REPO}/package.json" ]; then
            # This repository doesn't exist in this branch
            continue
        fi

        REMOVEDEPS=""
        DEPS=""
        DEVDEPS=""
        OPTDEPS=""
        PEERDEPS=""
        for DEP in $ALL_REPOS; do
            if jq -e .dependencies.\"$DEP\" "${BUILD_OUT}/packages/${REPO}/package.json" > /dev/null; then
                jq  "del(.dependencies.\"$DEP\")" "${BUILD_OUT}/packages/${REPO}/package.json"  | sponge "${BUILD_OUT}/packages/${REPO}/package.json"
                DEPS="$DEPS $DEP@*"
            fi
            if jq -e .devDependencies.\"$DEP\" "${BUILD_OUT}/packages/${REPO}/package.json" > /dev/null; then
                jq  "del(.devDependencies.\"$DEP\")" "${BUILD_OUT}/packages/${REPO}/package.json"  | sponge "${BUILD_OUT}/packages/${REPO}/package.json"
                DEVDEPS="$DEVDEPS $DEP@*"
            fi
            if jq -e .optionalDependencies.\"$DEP\" "${BUILD_OUT}/packages/${REPO}/package.json" > /dev/null; then
                jq  "del(.optionalDependencies.\"$DEP\")" "${BUILD_OUT}/packages/${REPO}/package.json"  | sponge "${BUILD_OUT}/packages/${REPO}/package.json"
                OPTDEPS="$OPTDEPS $DEP@*"
            fi
            if jq -e .peerDependencies.\"$DEP\" "${BUILD_OUT}/packages/${REPO}/package.json" > /dev/null; then
                jq  "del(.peerDependencies.\"$DEP\")" "${BUILD_OUT}/packages/${REPO}/package.json"  | sponge "${BUILD_OUT}/packages/${REPO}/package.json"
                PEERDEPS="$PEERDEPS $DEP@*"
            fi

            npm -C "$BUILD_OUT" uninstall "$DEP"
        done
        for DEP in $DEPS; do
            npm -C "$BUILD_OUT" install --force --save --save-exact "$NPM_ORGANIZATION/$DEP" -w "$NPM_ORGANIZATION/$REPO" || package_replacement_error "$REPO" "$BRANCH" "$DEP"
        done
        for DEP in $DEVDEPS; do
            npm -C "$BUILD_OUT" install --force --save-dev --save-exact "$NPM_ORGANIZATION/$DEP" -w "$NPM_ORGANIZATION/$REPO" || package_replacement_error "$REPO" "$BRANCH" "$DEVDEPS"
        done
        for DEP in $OPTDEPS; do
            npm -C "$BUILD_OUT" install --force --save-optional --save-exact "$NPM_ORGANIZATION/$DEP" -w "$NPM_ORGANIZATION/$REPO" || package_replacement_error "$REPO" "$BRANCH" "$OPTDEPS"
        done
        for DEP in $PEERDEPS; do
            npm -C "$BUILD_OUT" install --force --save-peer --save-exact "$NPM_ORGANIZATION/$DEP" -w "$NPM_ORGANIZATION/$REPO" || package_replacement_error "$REPO" "$BRANCH" "$PEERDEPS"
        done

        # replace the name of the package with the organization prefixed one
        find "$BUILD_OUT" -type f -exec sed -i -e "s:\(require(\|from\s\|resolve(\|node_modules\)\(['\"/]\)$REPO\(['\"/]\):\1\2$NPM_ORGANIZATION/$REPO\3:g" {} \;
    done

    npm -C "$BUILD_OUT" i --package-lock-only # sometimes this is necessary to get a consistent package-lock.json

    if ! git -C "$BUILD_OUT" diff --quiet package.json package-lock.json packages/*/package.json; then
        git -C "$BUILD_OUT" commit -m "chore(deps): use workspace versions of all local packages" \
            package.json package-lock.json packages/*/package.json
    fi
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

setup_github_actions () {
    cp -a .github/actions "$BUILD_OUT/.github/"
    npm -C "$BUILD_OUT" run refresh-gh-workflow

    git -C "$BUILD_OUT" add .github/
    git -C "$BUILD_OUT" commit -m "ci: populate workspace workflows"
}

build_scratch_svg_renderer () {
    echo "Attempting to generate all prerequisite files and to build scratch-svg-renderer"

    cd ./monorepo.out/packages/scratch-svg-renderer
    use_node_version_from_nvmrc
    process_workspace_webpack_config "." "webpack.config.js"
    npm run build
    cd -
}

build_scratch_render () {
    echo "Attempting to generate all prerequisite files and to build scratch-render"

    cd ./monorepo.out/packages/scratch-render
    use_node_version_from_nvmrc
    process_workspace_webpack_config "." ".jsdoc.json"
    process_workspace_webpack_config "./test/integration" "cpu-render.html"
    process_workspace_webpack_config "./test/integration" "index.html"
    process_workspace_webpack_config "." "webpack.config.js"
    npm run build
    cd -
}

build_scratch_vm () {
    echo "Attempting to generate all prerequisite files and to build scratch-scratch-vm"

    cd ./monorepo.out/packages/scratch-vm
    use_node_version_from_nvmrc
    process_workspace_webpack_config "." "webpack.config.js"
    npm run build
    cd -
}

build_scratch_gui () {
    echo "Attempting to generate all prerequisite files and to build scratch-scratch-gui"

    cd ./monorepo.out/packages/scratch-gui
    use_node_version_from_nvmrc
    process_workspace_webpack_config "." "webpack.config.js"
    npm run prepublish
    npm run build
    cd -
}

process_workspace_webpack_config () {
    FILE_PATH="$1"
    FILE_NAME="$2"

    PACKAGE_PATHS="$(egrep -o "[\.\/]*node_modules\/[^\"']*" "${FILE_PATH}/${FILE_NAME}" | uniq)"

    for PACKAGE_PATH in $PACKAGE_PATHS; do
        PATH_FROM_CURRENT_DIR="${FILE_PATH}/${PACKAGE_PATH}"

        if [ ! -d $PATH_FROM_CURRENT_DIR ] && [ ! -f $PATH_FROM_CURRENT_DIR ]; then
            sed -i -e "s:$PACKAGE_PATH:../../${PACKAGE_PATH}:g" "${FILE_PATH}/${FILE_NAME}"
        fi
    done
}

use_node_version_from_nvmrc () {
    source ~/.nvm/nvm.sh
    nvm install
    nvm use
}

### Do the things! ###

echo "Depending on your CPU, RAM, drives, and network, this may take about an hour."
echo "Make sure you have at least 10GB or so free on your drive."
echo "Press Ctrl-C now to cancel!"
echo "Starting in 15 seconds..."
sleep 15

mkdir -p "$BUILD_TMP"

#set -x

init_monorepo

for REPO in $ALL_REPOS; do
    add_repo_to_monorepo "$REPO"
    add_gh_pages "$REPO"
done

git -C "$BUILD_OUT" checkout -f --no-guess develop

if [ ! -f "$BUILD_OUT/package.json" ]; then
    echo "Something went wrong: $BUILD_OUT/package.json does not exist!"
    exit 1
fi

rmdir "$BUILD_TMP"

for BRANCH in $DEST_BRANCHES; do
    fixup_branch "$BRANCH"
    
    build_scratch_svg_renderer
    build_scratch_render
    build_scratch_vm
    build_scratch_gui

    git -C "$BUILD_OUT" add .
    git -C "$BUILD_OUT" commit -m "refactor: fixed paths to work with new project structure"
done

setup_github_actions # TODO: should we do this on every branch?

optimize_git_repo

echo "All done!"
echo "You'll need to manually fix up any CI/CD workflows."
echo "The monorepo is in: $BUILD_OUT"
