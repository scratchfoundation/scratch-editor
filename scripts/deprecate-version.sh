#!/usr/bin/env bash

version_to_deprecate="$1"
shift

message="$1"
shift

if [ -z "$version_to_deprecate" -o -z "$message" -o -n "$*" ]; then
    echo "Usage: $0 <version-or-range-to-deprecate> <message>"
    echo "Example: $0 1.2.3 'This version is deprecated. Please upgrade to version 2.3.4 or newer.'"
    exit 1
fi

echo "Deprecating version $version_to_deprecate with message: $message"

# `readarray` is convenient to avoid piping into the loop,
# ensuring that npm can authenticate interactively if needed
readarray -t packages < <(npm -ws pkg get name | jq -r '.[]')

for package in "${packages[@]}" '@scratch/scratch-gui-standalone'; do
    echo "Deprecating $package@$version_to_deprecate"
    npm deprecate "$package@$version_to_deprecate" "$message"
done
