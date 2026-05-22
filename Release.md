# Release process

_For maintainers of this monorepo._

All packages in this monorepo are published to npm with a shared version number. Releases are produced by the
**Publish** workflow, triggered manually from the Actions tab. The next version number and the changelog are
both computed from the Conventional Commits on the release branch.

## Releasing

1. Push the commits you want included to the branch you want to release from.
2. Open the [Publish workflow](https://github.com/scratchfoundation/scratch-editor/actions/workflows/publish.yml).
3. Click the **Run workflow** dropdown, choose the branch, and click the **Run workflow** button.
4. Wait for the workflow to finish. On success: the packages are on npm, a tag and GitHub release exist, and
   the version-bump commit is on the branch.

If there are no relevant commits since the last release on that branch, the workflow exits cleanly with a
"nothing to publish" notice. Pressing the button on a branch with only `chore:` or `docs:` commits is a no-op.

## Which branches can release

| Branch                 | Acts as                | npm dist-tag      | Example version          |
|------------------------|------------------------|-------------------|--------------------------|
| `develop`              | primary release        | `latest`          | `13.8.0`                 |
| `13.x`, `13.7.x`, etc. | maintenance            | matching the line | `13.7.5`                 |
| `release/<topic>`      | long-lived prerelease  | `<topic>`         | `13.8.0-accessibility.3` |
| `hotfix/<topic>`       | short-lived prerelease | `<topic>`         | `13.7.5-paint-fix.1`     |

The dist-tag for `release/*` and `hotfix/*` is the branch name with the prefix stripped. Pick a short, public-
facing branch suffix — it becomes the dist-tag downstream consumers see.

Other branches (`feat/*`, `fix/*`, `chore/*`, `feature/*`, bare names) are not releasable. The workflow run
will fail at the branch-validation step.

## Conventional Commits matter

Version bumps are computed from commit types:

- `fix:` → patch
- `feat:` → minor
- `BREAKING CHANGE:` in the body (or `!:` in the header) → major
- `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `ci:`, `build:` → no release

A wrong commit type means a wrong version bump. The husky hook enforces the format, but it's up to you to categorize
your commit correctly.
