---
name: create-pr
description: Prepare a clear, reviewer-friendly pull request (or merge request) for the current branch, with a title, description and link, and either open it or just hand over the text. Works with any Git host and any issue tracker (Jira, GitHub Issues, Linear, GitLab, Azure Boards and others). Use this whenever the user wants to create, open or prepare a PR, pull request or MR, asks for a PR description, PR text or PR summary, says things like "make a PR for this" or "write up this branch for review", or is wrapping up a branch for review, even if they only ask for the description or the link.
---

# Create PR

Turn the work on a branch into a pull request that a reviewer without context can understand quickly.

## 1. Settle what the user wants delivered

There are two ways to finish:
- **Push and open the PR.** Push the branch, then create the PR with the host's CLI. If that isn't available, give a ready-made link to create it in the browser.
- **Share the content only.** Write the title and description for the user to use however they like. Nothing is pushed, and no PR is created.

If the request already makes the choice clear, follow it and don't ask. Examples:
- "Create the PR" or "open a PR" means push and open.
- "Write the PR description", "draft the PR text" or "don't push" means content only.

Otherwise, ask once before doing anything that leaves the machine, using the question tool if one is available. Pushing and opening a PR are visible to other people, so the user should choose them on purpose.

## 2. Work out what the PR contains

- **Base branch.** Use the one the user names. Otherwise, work it out rather than assuming `main` or `develop`. Projects often keep long-lived feature or release branches, so check:
  - where the branch was created from;
  - its upstream;
  - `git merge-base` against the likely candidates.

  If two bases are equally plausible, ask: a PR against the wrong base can merge unfinished work into the main line.
- **The change itself.** Read `git log <base>..HEAD` and `git diff <base>...HEAD`. Read enough of the changed code to describe its effect, not just its file names.
- **The ticket.** Look for an issue reference in the branch name, the commits or the user's message. It could be a key like `ABC-123`, an issue number like `#123`, or an issue URL. Read the ticket with whatever the session has for that tracker:
  - a Jira/Atlassian, Linear or other tracker tool;
  - `gh issue view` for GitHub Issues;
  - `glab issue view` for GitLab.

  The ticket usually explains the *why* better than the diff does. If there's no way to read it, use what the user and the commits say, and mention that the ticket wasn't read.
- **An existing PR.** If you're going to push, check first whether the branch already has an open PR (`gh pr view`, `glab mr view`, or the host's web page). If it does, report it, and offer the new text for updating it instead of creating a duplicate. Also mention it if the branch is already merged.

## 3. Commit and push (only when pushing)

- **Don't commit unless the user asks.** If they do, follow the repo's commit convention (for example, Conventional Commits) and let the hooks run. If a hook is broken rather than failing, tell the user instead of using `--no-verify`.
- **Push the branch** with `git push -u <remote> <branch>`. Hosts sometimes reject a push with a temporary server error. Retry once before reporting a failure.

## 4. Pick the template

Use the repo's own template if it has one, for example:
- GitHub: `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, `PULL_REQUEST_TEMPLATE.md` or `docs/`;
- GitLab: `.gitlab/merge_request_templates/`;
- Azure DevOps: `.azuredevops/pull_request_template.md`.

Keep the template's section names, even where they differ from the ones below; put each kind of content in the closest section. If the repo has no template, use these four sections, which "Writing the description" below explains:

```markdown
### Resolves

### Proposed Changes

### Reason for Changes

### Test Coverage
```

## 5. Write the title and description

See "Writing the description" below. This is the part that matters most.

## 6. Hand it over

**Content only:** give the title in its own `text` block and the description in a `markdown` block, so each can be copied with one click. Add any notes for the user after them, outside the blocks.

**Push and open:**
- **With the host's CLI**, when it's installed and signed in (check with `gh auth status` or `glab auth status`), create the PR:
  - GitHub: `gh pr create --base <base> --head <branch> --title "<title>" --body-file <file>`
  - GitLab: `glab mr create --target-branch <base> --source-branch <branch> --title "<title>" --description "<text>"`

  Only open it as a draft if the user asked for one. Report the URL.
- **Without a CLI**, give a link that opens the PR form with the base already set, then the title and description blocks as above:
  - GitHub: `https://github.com/<owner>/<repo>/compare/<base>...<branch>?expand=1`
  - GitLab: `https://gitlab.com/<group>/<project>/-/merge_requests/new?merge_request[source_branch]=<branch>&merge_request[target_branch]=<base>`
  - Bitbucket: `https://bitbucket.org/<workspace>/<repo>/pull-requests/new?source=<branch>&dest=<base>`

## Writing the description

Write for a reviewer who hasn't followed the work: a teammate from another project, a product manager, or someone reading it months later. If they can't tell what changed and why after reading it once, it's too technical.

**Title.** If there's a ticket, use its identifier in brackets followed by the ticket's own title, copied from the ticket: `[ABC-123] Let admins export reports as CSV`. Use the identifier exactly as the tracker shows it (`[ABC-123]`, `[#123]`, `[LIN-45]`).
- **Why the ticket's title:** read it from the ticket, not from the commits. Commit messages describe the code change, while the ticket title is how the team knows the work, and the identifier makes the PR easy to find from the ticket.
- **If the repo's merged PRs follow a different title convention,** follow that instead.
- **If the ticket can't be read,** say so, and put a short summary of the commits after the identifier until the user confirms the ticket's title.
- **If there's no ticket,** write a one-line summary that follows the repo's commit convention, and don't invent an identifier.

**Resolves.** Link the ticket or issue, with its title. Use the link the tracker gives you (from the tool's response or the issue page); don't build one from a guessed domain or URL pattern. If you don't have a real link, give the identifier without a link and tell the user. GitHub and GitLab close the issue on merge if you write `Closes #123`; use that only when the repo does.

**Proposed Changes.** This is the only section with implementation detail, and only the detail that matters:
- **Start with one or two plain sentences** on what changes, in terms of behaviour: what users, integrators or other code can now do. Write them for someone who doesn't know the area, with no technical terms they would have to look up. Those can appear in the bullets, where a reviewer who needs them will look.
- **Then one bullet per specific change that matters, and keep each bullet to one sentence.** Name the piece (in `code`) and say what it does for the reader: *what* changes, not *how* it works. For example: "`exportReport` lets admins download any report as CSV." Not: "Added an `exportReport` thunk that streams rows through a `CsvWriter` with a 500-row buffer."
  - If a bullet needs a second sentence to explain a mechanism, cut the mechanism; it belongs in the code and the docs.
  - For security-sensitive changes, a short clause on what is now prevented is enough: "so scripts from other sites can't run in the frame".
- **Leave the mechanism to the code and the docs.** If a change comes with configuration, settings or a migration, one bullet saying what it is and where it's documented is enough (for example, "Three deploy settings control the rollout; the README explains them"). Don't list every option and its default.
- **Aim for no more than about six bullets.** If there are more, group related changes into one bullet, or drop the ones a reviewer doesn't need up front: internal renames, refactors that don't change behaviour, test helpers. They're in the diff.
- **Flag breaking changes clearly,** in one short bullet starting with **Breaking:**.
- **Mention behaviour that stays the same** when that's what a reviewer would worry about (for example, "Users without the new permission see the page as before").

**Reason for Changes.** A few plain sentences on why: the user or product need, and any decision agreed with others (for example, "The rounding behaviour was agreed with finance"). No implementation detail.

**Test Coverage.** Describe what the tests check in terms of behaviour, in a few short bullets, not a list of test files.
- **Only say that tests and lint pass** if you ran them in this session, or the user or CI confirmed it. A reviewer trusts that line, so if you haven't seen it, leave it out and tell the user it's missing.
- **Mention manual verification** only if it was actually done.

**Dependencies and overlaps.** If the PR overlaps or depends on other tickets or PRs, add one short note at the end (for example, "this overlaps with ABC-120, so merging the second of the two will need a small conflict fix").

**Leave out:**
- Problems with the local machine, such as tests that couldn't run locally because of local setup. They aren't about the change, and CI covers them.
- Long lists of edge cases and known limitations. Keep at most the one or two a reviewer would trip over, in a sentence each.
- AI attribution lines such as "Generated with Claude Code", unless the user asks for them.

Keep the whole description short enough to read on one screen: an intro and up to about six one-sentence bullets in Proposed Changes, and two to four lines or bullets in each other section. Before handing it over, reread it as the reviewer would. Cut anything that explains how the code works rather than what it changes, and anything a reviewer could skip without missing something important.

If you notice things the user should know that don't belong in the description, tell the user next to the description instead of putting them in it. For example: uncommitted local changes, an unconfirmed test status, an existing or merged PR, or commits by someone else.

## Example

An illustration of the length and tone to aim for. Match its level of detail, not its wording or structure; the template and the change decide those.

```text
[ABC-123] Let admins export reports as CSV
```

```markdown
### Resolves

[ABC-123](https://tracker.example.com/browse/ABC-123): Let admins export reports as CSV

### Proposed Changes

Admins can now download any report as a CSV file from the report page.

- `exportReport` builds the CSV from the same filters the admin sees on screen.
- The report page shows an "Export CSV" button to admins only.
- Exports of more than 50,000 rows are refused with a message suggesting a narrower filter.

### Reason for Changes

Admins were copying report tables into spreadsheets by hand. Finance asked for an export they can open directly in their tools.

### Test Coverage

Added tests for:
- the CSV matching the filtered report;
- the button only appearing for admins;
- large exports being refused with the message.
```
