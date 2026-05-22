// semantic-release expands `${...}` in its own template syntax, so plain strings
// here use those references intentionally — the lint rule is off for this file:
/* eslint-disable no-template-curly-in-string */

// No @semantic-release/npm: per-package publishing stays in the cd job.
// No @semantic-release/github: the GitHub release is created by the finalize
// job, using the commit body as the release notes.

import {commitPartial, commitsSort, finalizeContext} from './scripts/release-notes-writer-opts.mjs';

export default {
    branches: [
        'develop',
        '+([0-9])?(.{+([0-9]),x}).x',
        { name: 'release/*', prerelease: '${name.replace(/^release\\//, "")}' },
        { name: 'hotfix/*', prerelease: '${name.replace(/^hotfix\\//, "")}' }
    ],
    plugins: [
        '@semantic-release/commit-analyzer',
        ['@semantic-release/release-notes-generator', { writerOpts: {commitPartial, commitsSort, finalizeContext} }],
        [
            '@semantic-release/exec',
            {
                prepareCmd: 'npm version "${nextRelease.version}" --no-git-tag-version',
                publishCmd: 'printf "%s" "${nextRelease.version}" > .release-version && printf "%s" "${nextRelease.channel || \'\'}" > .release-channel'
            }
        ],
        [
            '@semantic-release/git',
            {
                assets: [
                    'package.json',
                    'package-lock.json',
                    'packages/*/package.json'
                ],
                message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
            }
        ]
    ]
};
