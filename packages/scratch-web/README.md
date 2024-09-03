# Scratch Web

## Environment Variables

Environment variables do not follow the regular convention where they are statically defined in the output JS bundle. Instead, they are served through a `config.js` file that is expected to be available on the root of the (sub)domain where the application is served. A plugin in [vite-config-js-plugin.ts] adds a reference to `/config.js?v=<random-string>` to be loaded before the JS bundle. The random string changes on each build and is there to bust any caches when a new version of the code is deployed.

The goal is to be able to deploy a build artifact (the JS/asset bundle) to multiple environments instead of having to rebuild for each one (as normally env variables are statically inserted into the bundle).

Effectively we've created two types of environment variables:

1. Environment (as in dev, staging, prod) configuration - env variables that are prefixed with `SCRATCH_WEB_`.
2. Build-time configuration - env variables that are inserted into the bundle and cannot be changed later. These are prefixed with `VITE_BUILD_TIME_STATIC_`

Use the first type unless you need some sort of code elimination (like a `VITE_BUILD_TIME_STATIC_DEBUG` option that enables or disables some code that shouldn't be included in the final bundle at all).

For development, env variables (both types) are loaded from either the shell environment or `scratch-editor/.env`.
