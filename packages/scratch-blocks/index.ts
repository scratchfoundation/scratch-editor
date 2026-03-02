// Given the current configuration in this repo,
// TS and webpack disagree on the shape of the module's export(s).
// This shim compensates for that difference.
export * as ScratchBlocks from './src/index';
