#!/bin/bash

set -e

ALL_PACKAGES="
    scratch-gui \
    scratch-render \
    scratch-svg-renderer \
    scratch-vm \
"
NPM_VERSION=$1

edit_json () {
    command=$1
    file_name=$2
    tmp_file_name="$file_name.tmp"

    jq "$command" "$file_name" > "$tmp_file_name"
    mv "$tmp_file_name" "$file_name"
}

for PACKAGE in $ALL_PACKAGES; do
    cd "./packages/$PACKAGE"

    npm version "$NPM_VERSION" --allow-same-version --git-tag-version=false --workspaces=false
    
    for DEPENDENCY in $ALL_PACKAGES; do
        DEPENDENCY="@scratch/$DEPENDENCY"

        if jq -e .dependencies.\"$DEPENDENCY\" ./package.json > /dev/null; then
            edit_json ".dependencies.\"$DEPENDENCY\" |= \"$NPM_VERSION\"" ./package.json
        fi
        if jq -e .devDependencies.\"$DEPENDENCY\" ./package.json > /dev/null > /dev/null; then
            edit_json ".devDependencies.\"$DEPENDENCY\" |= \"$NPM_VERSION\"" ./package.json
        fi
        if jq -e .optionalDependencies.\"$DEPENDENCY\" ./package.json > /dev/null > /dev/null; then
            edit_json ".optionalDependencies.\"$DEPENDENCY\" |= \"$NPM_VERSION\"" ./package.json
        fi
        if jq -e .peerDependencies.\"$DEPENDENCY\" ./package.json > /dev/null > /dev/null; then
            edit_json ".peerDependencies.\"$DEPENDENCY\" |= \"$NPM_VERSION\"" ./package.json
        fi
    done

    cd -
done
