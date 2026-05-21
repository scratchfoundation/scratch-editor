#!/usr/bin/env bash

set -e

# `npm version 1.2.3` does the following:
# 1. Update `/package.json` and `/package-lock.json` with the new version
# 2. `git add package.json package-lock.json`
# 3. `git commit -m 1.2.3`
# 4. `git --no-replace-objects tag -m 1.2.3 v1.2.3`

# `npm --workspaces version 1.2.3` changes step 1 to update the version of each workspace but NOT the root.
# The other steps are executed as-is: step 2 will say there's nothing to commit and the process will stop.
# The version numbers in `/packages/*/package.json` will be updated but not committed.

# `npm --workspaces --include-workspace-root version 1.2.3` changes step 1 to update the version of each workspace AND
# the root. However, the remaining steps are still unaltered. You'll end up with a commit that only updates the
# workspace root, and the version numbers in `/packages/*/package.json` will be updated but not committed.

# Fortunately, npm runs the `version` script as part of this process. Unfortunately, the script runs after
# `/package.json` and `/package-lock.json` are updated, but before `/packages/*/package.json` are updated. That
# means the `--workspaces` flag isn't helping, and we need to update workspace versions ourselves. We can do that with
# `npm --workspaces version --no-git-tag-version ${npm_package_version}` and then stage the files.

# (Props to this post: <https://blog.chlod.net/technical/easy-npm-version-synchronization-for-monorepos/>)

# BUT WAIT!

# What about `--no-git-tag-version`? The normal behavior for `npm version` in that case is to adjust version numbers
# but not stage or commit anything. If this script stages `/packages/*/package.json` in that case, that's no good.

# The only way I've found to detect `--no-git-tag-version` is to check for the existence of an environment variable
# called `npm_config_git_tag_version`. Unfortunately, it's considered "true" when the value is an empty string, so we
# need to check for that as well. Big thanks to this StackOverflow answer: <https://serverfault.com/a/382740>
# TL;DR: `[ -z "${npm_config_git_tag_version+set}" ]` is test we want.

# So, the plan is:
# 1. The user should run `npm version 1.2.3`
# 2. npm will update `/package.json` and `/package-lock.json` for the workspace root
# 3. npm will run this script (it should be set as the `version` script in `/package.json`)
# 4. This script will stage `/packages/*/package.json` if `npm_config_git_tag_version` exists
# 5. npm will choose whether to commit / tag afterward on its own

me="$(basename "$0")"

if [ -z "${npm_package_version}" ]; then
    echo "This script should be run by npm as part of the versioning process."
    echo "To test it, run: npm version --no-git-tag-version 1.2.3"
    echo "If you really must run it outside of npm, try: npm_package_version=1.2.3 npm_config_git_tag_version='' ${me}"
    echo "Be aware that running it directly will not update the version in /package.json"
    exit 1
fi

update_dependency_in_workspace () {
    workspace="$1"
    dependency="$2"

    jq_filter="
        if .dependencies.\"$dependency\" then
            .dependencies.\"$dependency\" = \"$npm_package_version\"
        else
            .
        end |
        if .devDependencies.\"$dependency\" then
            .devDependencies.\"$dependency\" = \"$npm_package_version\"
        else
            .
        end |
        if .optionalDependencies.\"$dependency\" then
            .optionalDependencies.\"$dependency\" = \"$npm_package_version\"
        else
            .
        end |
        if .peerDependencies.\"$dependency\" then
            .peerDependencies.\"$dependency\" = \"$npm_package_version\"
        else
            .
        end
    "

    jq "$jq_filter" "$workspace/package.json" > "$workspace/package.json.tmp"
    mv "$workspace/package.json.tmp" "$workspace/package.json"
}

echo "${me}: Reading workspaces..." >&2
readarray -t workspace_locations < <( npm query .workspace | jq -r '.[].location' )
readarray -t workspace_names < <( npm query .workspace | jq -r '.[].name' )

# Use jq to set the version directly instead of `npm --workspaces version`.
# Using npm would cause npm to run an install, which (seeing the old cross-dependency version
# specs) would install old published versions of workspace packages into local node_modules,
# shadowing the workspace symlinks during the subsequent build.
echo "${me}: Setting workspace versions..." >&2
for workspace in "${workspace_locations[@]}"; do
    jq ".version = \"${npm_package_version}\"" "$workspace/package.json" > "$workspace/package.json.tmp"
    mv "$workspace/package.json.tmp" "$workspace/package.json"
done

echo "${me}: Updating internal dependency versions..." >&2
for workspace in "." "${workspace_locations[@]}"; do
    for dependency in "${workspace_names[@]}"; do
        update_dependency_in_workspace "$workspace" "$dependency"
    done
done

echo "${me}: Asking npm to clean up the lock file..." >&2
npm install --offline --no-audit --no-fund --ignore-scripts --package-lock-only
# Sometimes it makes further changes the second time
npm install --offline --no-audit --no-fund --ignore-scripts --package-lock-only

if [ -z "${npm_config_git_tag_version+set}" ]; then
    echo "${me}: Staging workspace package.json files..." >&2
    git add package.json package-lock.json
    for workspace in "${workspace_locations[@]}"; do
        git add "$workspace/package.json"
    done
fi

echo "${me}: Done!" >&2
