# scratch-editor: The Scratch Editor Monorepo

If you'd like to use Scratch, please visit the [Scratch website](https://scratch.mit.edu/). You can build your own
Scratch project by pressing "Create" on that website or by visiting <https://scratch.mit.edu/projects/editor/>.

This is a source code repository for the packages that make up the Scratch editor and a few additional support
packages. Use this if you'd like to learn about how the Scratch editor works or to contribute to its development.

## Raspberry Pi Foundation fork (`experience-cs`)

This repository is a public fork of [scratchfoundation/scratch-editor](https://github.com/scratchfoundation/scratch-editor), maintained for Experience CS and related products. Modified source is published under AGPL-3.0; published npm packages should correspond to a specific commit on this repository.

### Upstream anchor and integration branch

| | |
|---|---|
| **Upstream release** | [`v13.7.3`](https://github.com/scratchfoundation/scratch-editor/releases/tag/v13.7.3) on [scratchfoundation/scratch-editor](https://github.com/scratchfoundation/scratch-editor) |
| **Integration branch** | [`experience-cs`](https://github.com/RaspberryPiFoundation/scratch-editor/tree/experience-cs) — long-lived branch; feature work merges here via PR |
| **Published package** | [`@RaspberryPiFoundation/scratch-gui`](https://github.com/RaspberryPiFoundation/scratch-editor/pkgs/npm/scratch-gui) on GitHub Packages |

This was base on the latest upstream release tag `v13.7.3` with RPF-specific packaging and CI.

### Local development

Use the Node version in [`.nvmrc`](.nvmrc). Install dependencies from the **repository root**:

```bash
nvm install
nvm use
NODE_ENV=development npm ci
npm run build
```

Root [`.npmrc`](.npmrc) routes the `@RaspberryPiFoundation` scope to GitHub Packages. This requires a Github access token with `read:packages` and `repo`.

```bash
cd packages/scratch-gui
npm run test:lint
npm run test:unit
npm start   # http://localhost:8601/
```

### CI and publishing

- **Pull requests:** CI runs build and tests; **no** package is published to GitHub Packages.
- **Push to `experience-cs`:** CI builds and publishes `@RaspberryPiFoundation/scratch-gui` with a version such as `13.7.3-experience-cs.YYYYMMDDHHMMSS`. Pin an explicit version in consumers (e.g. editor-ui); do not rely on floating `latest` in production.
- Publishing is configured in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (inline publish step on the `experience-cs` branch only). Upstream’s npmjs release workflow (`.github/workflows/publish.yml`) is disabled on this fork.

## What's in this repository?

The `packages` directory in this repository contains:

- `scratch-gui` provides the buttons, menus, and other elements that you interact with when creating and editing a
  project. It's also the "glue" that brings most of the other modules together at runtime.
- `scratch-render` draws backdrops, sprites, and clones on the stage.
- `scratch-svg-renderer` processes SVG (vector) images for use with Scratch projects.
- `scratch-vm` is the virtual machine that runs Scratch projects.

_Please add to this list as more packages are migrated to the monorepo._

Each package has its own `README.md` file with more information about that package.

## Monorepo migration

### What's going on?

We're migrating the Scratch editor packages into this monorepo. This will allow us to manage all the packages that
make up the Scratch editor in one place, making  it easier to manage dependencies and make changes that affect
multiple packages.

### Why are there only a few packages in this repo?

We're migrating packages in stages. The current plan, which is subject to change, has us migrating repositories in
four batches. We plan to complete the migration within 2025.

### What will happen to the existing repositories?

The existing repositories will be archived and made read-only. Those repositories contain valuable work and
information, including but not limited to issues and pull requests. We plan to keep that information available for
reference, and to selectively migrate it to this new repository.

## Thank you

Scratch would not be what it is today without help from the global community of Scratchers and open-source
contributors. Thank you for your contributions and support. _[Scratch on!](https://scratch.mit.edu/projects/65347738/fullscreen/)_

## Donate

We provide [Scratch](https://scratch.mit.edu) free of charge, and want to keep it that way! Please consider making a
[donation](https://www.scratchfoundation.org/donate) to support our continued engineering, design, community, and
resource development efforts. Donations of any size are appreciated. Thank you!
