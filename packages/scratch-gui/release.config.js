module.exports = {
    extends: 'scratch-semantic-release-config',
    branches: [
        {
            name: 'develop'
            // default channel
        },
        {
            name: 'alpha',
            channel: 'alpha',
            prerelease: true
        },
        {
            name: 'beta',
            channel: 'beta',
            prerelease: true
        },
        {
            name: 'hotfix/REPLACE', // replace with actual hotfix branch name
            channel: 'hotfix',
            prerelease: 'hotfix'
        }
    ]
};
