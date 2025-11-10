jq '
    if .name != "@scratch/scratch-gui-standalone" then
        .name = "@scratch/scratch-gui-standalone" |
        del(.peerDependencies) |
        .exports."." = .exports."./standalone" |
        del(.exports."./standalone")
    else
        .
    end
' ./packages/scratch-gui/package.json | npx sponge ./packages/scratch-gui/package.json