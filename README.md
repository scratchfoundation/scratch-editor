# scratch-editor

Scratch editor mono-repo.

It includes both packages like scratch-gui that are utilized in the current Scratch system and the NextGen one, and NextGen specific ones.

## Index of Packages

### scratch-web

This is the front-end application for the NextGen platform. It's built on React, TypeScript and uses Vite as a build tool.
Please review [packages/scratch-web/README.md] for further detail.

### scratch-web-shared

A library for React components and utilities shared between Scratch front-end projects. Currently only scratch-web uses them.

## Tooling

The NextGen projects use eslint and prettier. These are run automatically on commit.
If you're using VSCode, we recommend having the eslint, prettier and tailwindcss extensions installed (see [.vscode/extensions.json]).
