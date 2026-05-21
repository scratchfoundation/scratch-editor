#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const json5 = require('json5');
const { createHash } = require('node:crypto');

// formatting constants
const INDENT = 4;
const ASSET_TYPES = {
  costumes: 'costumes',
  sounds: 'sounds',
  sprites: 'sprites',
  backdrops: 'backdrops'
};
const TAGS_BEHAVIOR = {
  INHERIT: 'inherit',
  NONE: 'none'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    inputDir: null,
    // Should we output the constructed libraries to files or just return them?
    outputDir: null,
    // Should we fill costumes/sounds libs from the sprites definitions?
    fillAssetsFromSprites: true
  };

  for (let i = 0; i < args.length; i++) {
    // TODO: Consider allowing custom output dir
    if (args[i] === '--output' || args[i] === '-o') {
      config.outputDir = 'output';
    } else if (!config.inputDir) {
      config.inputDir = args[i];
    }
  }

  if (!config.inputDir) {
    console.error('Usage: node build_media_libraries.js <input-dir> [--output|-o]');
    process.exit(1);
  }
  return config;
}

function calculateMD5(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = createHash('md5');
  hash.update(buffer);
  return hash.digest('hex');
}

function calculateTags(assetDef, defaultBehaviour, parentTags = []) {
  if (assetDef.tags === TAGS_BEHAVIOR.INHERIT) {
    return parentTags;
  } else if (Array.isArray(assetDef.tags)) {
    return assetDef.tags;
  } else {
    return defaultBehaviour === TAGS_BEHAVIOR.INHERIT ? parentTags : [];
  }
}

// Process a single asset definition (costume, sound, backdrop)
function processAssetDefinition(assetType, assetDef, dirPath, parentTags = []) {
  const assetFilePath = path.resolve(dirPath, assetDef.file);

  if (!fs.existsSync(assetFilePath)) {
    console.warn(`Warning: File not found: ${assetFilePath} (referenced by ${assetDef.name})`);
    return null;
  }

  const md5 = calculateMD5(assetFilePath);
  const ext = path.extname(assetFilePath).toLowerCase().substring(1); // e.g. svg
  const md5ext = `${md5}.${ext}`;

  // Construct the output object
  let outputAsset = {
    name: assetDef.name,
    assetId: md5,
    md5ext: md5ext,
    dataFormat: ext,
  };

  if (assetType === ASSET_TYPES.costumes || assetType === ASSET_TYPES.backdrops) {
    outputAsset = {
      ...outputAsset,
      bitmapResolution: assetDef.bitmapResolution || 1,
      rotationCenterX: assetDef.rotationCenterX,
      rotationCenterY: assetDef.rotationCenterY,
      tags: calculateTags(assetDef, TAGS_BEHAVIOR.INHERIT, parentTags),
    }
  }

  if (assetType === ASSET_TYPES.sounds) {
    outputAsset = {
      ...outputAsset,
      tags: calculateTags(assetDef, TAGS_BEHAVIOR.NONE, parentTags),
      rate: assetDef.rate,
      sampleCount: assetDef.sampleCount
    }
  }

  if (assetType === ASSET_TYPES.sprites) {
    outputAsset = {
      ...outputAsset,
      tags: calculateTags(assetDef, TAGS_BEHAVIOR.NONE, parentTags),
      isStage: assetDef.isStage || false,
      ...{ variables: assetDef.variables || {} },
      ...{ blocks: assetDef.blocks || {} }
      // TODO: Should we preserve other possible properties (no such cases exist in the current editor libraries):
      // `lists`, `broadcasts`, `currentCostume`, `comments`, etc.?
    }
  }

  return outputAsset;
}

function buildLibraries(config) {
  const { inputDir, outputDir, fillAssetsFromSprites } = config;

  const collections = {
    sprites: [],
    backdrops: [],
    costumes: [],
    sounds: []
  };

  const processAssetType = (type) => {
    const fullPath = path.join(inputDir, type);
    if (!fs.existsSync(fullPath)) return;

    const itemFolders = fs.readdirSync(fullPath, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const dirent of itemFolders) {
      const folderPath = path.join(fullPath, dirent.name);
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json') || f.endsWith('.json5'));
      if (files.length === 0) {
        console.warn(`No definition JSON found in ${folderPath}`);
        continue;
      }

      // Prefer file matching folder name
      const defFile = files.find(f => f.startsWith(dirent.name)) || files[0];

      let content;
      try {
        content = fs.readFileSync(path.join(folderPath, defFile), 'utf8');
      } catch (e) {
        console.error(`Failed to read definition file ${defFile} in ${folderPath}: ${e.message}`);
        continue;
      }

      let collectionDef;
      try {
        collectionDef = json5.parse(content);
      } catch (err) {
        console.error(`Error parsing definition file ${defFile}:`, err.message);
        continue;
      }
      if (
        Object.values(ASSET_TYPES).includes(type) &&
        type !== ASSET_TYPES.sprites &&
        collectionDef[type] &&
        Array.isArray(collectionDef[type])
      ) {
        collectionDef[type].forEach(def => {
          const processedItem = processAssetDefinition(type, def, folderPath, []);

          if (processedItem) {
            collections[type].push(processedItem);
          }
        });
      } else if (type === ASSET_TYPES.sprites && collectionDef.sprites && Array.isArray(collectionDef.sprites)) {
        // Preprocess costumes and sounds for lookup
        const fileCostumes = {};
        const fileSounds = {};

        // TODO: Should we assume that it's possible to have multiple sprites in a single definition file?
        const parentSpriteTags = collectionDef.sprites[0]?.tags || [];

        // TODO: Merge these cases with the standalone ones
        if (collectionDef.costumes && Array.isArray(collectionDef.costumes)) {
          collectionDef.costumes.forEach(def => {
            const processedCostume = processAssetDefinition(ASSET_TYPES.costumes, def, folderPath, parentSpriteTags);
            if (processedCostume) {
              fileCostumes[def.name] = processedCostume;
            }
          });
        }

        if (collectionDef.sounds && Array.isArray(collectionDef.sounds)) {
          collectionDef.sounds.forEach(def => {
            const processedSound = processAssetDefinition(ASSET_TYPES.sounds, def, folderPath, parentSpriteTags);
            if (processedSound) {
              fileSounds[def.name] = processedSound;
            }
          });
        }

        collectionDef.sprites.forEach(spriteDef => {
          const resolvedCostumes = (spriteDef.costumes || []).map(ref => {
            const found = fileCostumes[ref];
            if (!found) {
              console.warn(`Warning: Sprite ${spriteDef.name} references missing costume '${ref}' in ${defFile}`);
            }
            return found;
          }).filter(c => c);

          const resolvedSounds = (spriteDef.sounds || []).map(ref => {
            const found = fileSounds[ref];
            if (!found) {
              console.warn(`Warning: Sprite ${spriteDef.name} references missing sound '${ref}' in ${defFile}`);
            }
            return found;
          }).filter(s => s);

          collections.sprites.push({
            name: spriteDef.name,
            tags: spriteDef.tags || [],
            isStage: spriteDef.isStage || false,
            costumes: resolvedCostumes,
            sounds: resolvedSounds,
            ...{ variables: spriteDef.variables || {} },
            ...{ blocks: spriteDef.blocks || {} }
            // TODO: Should we preserve other possible properties (no such cases exist in the current editor libraries):
            // `lists`, `broadcasts`, `currentCostume`, `comments`, etc.?
          });

          // Add to global libs if requested
          if (fillAssetsFromSprites) {
            resolvedCostumes.forEach(c => collections.costumes.push(c));
            resolvedSounds.forEach(s => collections.sounds.push(s));
          }
        });
      }
    }
  };

  // Process asset types.
  // Assume inputDir has subdirs following the asset type format: 
  // sprites/, backdrops/, costumes/, sounds/
  processAssetType(ASSET_TYPES.sprites);
  processAssetType(ASSET_TYPES.backdrops);
  processAssetType(ASSET_TYPES.sounds);
  processAssetType(ASSET_TYPES.costumes);

  // Deduplication logic in case same asset appears multiple times
  // (e.g. if multiple sprites are using pop.wav sounds)
  const dedup = (list) => {
    const seen = new Set();
    const seenNames = new Set();

    return list.filter(item => {
      const key = `${item.md5ext}-${item.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      if (seenNames.has(item.name.toLowerCase())) {
        console.warn(`Warning: Duplicate asset name detected across different md5exts: '${item.name}'. This may cause issues in Scratch if both assets are used together.`);
      }
      else {
        seenNames.add(item.name.toLowerCase());
      }
      seen.add(key);
      return true;
    });
  }
  collections.costumes = dedup(collections.costumes);
  collections.sounds = dedup(collections.sounds);

  // Sort everything by name and md5ext
  const compareByNameAndMd5ext = (a, b) => {
    const nameComparison = a.name.localeCompare(b.name);
    if (nameComparison !== 0) return nameComparison;

    // Sprites have no md5ext, so consider them equal if names are the same
    if (!a.md5ext && !b.md5ext) return 0;

    return a.md5ext.localeCompare(b.md5ext);
  };

  collections.sprites.sort(compareByNameAndMd5ext);
  collections.backdrops.sort(compareByNameAndMd5ext);
  collections.costumes.sort(compareByNameAndMd5ext);
  collections.sounds.sort(compareByNameAndMd5ext);

  if (outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outputDir, 'sprites.json'), JSON.stringify(collections.sprites, null, INDENT));
    fs.writeFileSync(path.join(outputDir, 'backdrops.json'), JSON.stringify(collections.backdrops, null, INDENT));
    fs.writeFileSync(path.join(outputDir, 'costumes.json'), JSON.stringify(collections.costumes, null, INDENT));
    fs.writeFileSync(path.join(outputDir, 'sounds.json'), JSON.stringify(collections.sounds, null, INDENT));
    console.log(`Libraries generated in output dir: ${outputDir}`);
  }

  return collections;
}

if (require.main === module) {
  const config = parseArgs();
  buildLibraries(config);
} else {
  module.exports = { buildLibraries };
}
