const fs = require('node:fs');
const path = require('node:path');
const fixturesDir = path.resolve(__dirname, '../fixtures'); // Directory for test fixtures

const getAssetsFromData = (data, spriteDir) => Object.entries(data).map(([name, asset]) => {
  const assetFileName = `${name}.${asset.ext}`;
  fs.writeFileSync(path.join(spriteDir, assetFileName), asset.data);

  return {
    name,
    file: assetFileName,
    ...asset.jsonOptions
  };
});

const generateAsset = (inputDir, assetType, data, jsonOptions = {}) => {
  const { name: assetName, ext: assetExt } = jsonOptions;

  if (!assetName || !assetExt) {
    throw new Error('Asset name and ext must be provided in jsonOptions');
  }

  const assetDir = path.join(inputDir, assetType, assetName);

  fs.mkdirSync(assetDir, { recursive: true });
  fs.writeFileSync(path.join(assetDir, `${assetName}.${assetExt}`), data);

  const jsonContent = {
    '$schema': '../../../schemas/media-collection-schema.json',
    [assetType]: [{
      file: `${assetName}.${assetExt}`,
      ...jsonOptions
    }]
  };

  fs.writeFileSync(path.join(assetDir, `${assetName}.json5`), JSON.stringify(jsonContent));
}

const generateSprite = (inputDir, costumesData = {}, soundsData = {}, jsonOptions = {}) => {
  if (!jsonOptions.name) {
    throw new Error('Sprite name must be provided in jsonOptions');
  }

  const spriteDir = path.join(inputDir, 'sprites', jsonOptions.name);
  fs.mkdirSync(spriteDir, { recursive: true });

  // Write costume and sound files
  const costumes = getAssetsFromData(costumesData, spriteDir);
  const sounds = getAssetsFromData(soundsData, spriteDir);

  const jsonContent = {
    '$schema': '../../../schemas/media-collection-schema.json',
    sprites: [{
      costumes: costumes.map(c => c.name),
      sounds: sounds.map(s => s.name),
      ...jsonOptions
    }],
    costumes,
    sounds
  };

  fs.writeFileSync(path.join(spriteDir, `${jsonOptions.name}.json5`), JSON.stringify(jsonContent));
}

const createNewBackdrop = (options = {}) => {
  const pngPath = options.path ?? path.join(fixturesDir, 'Arctic.png');
  const backdrop = fs.readFileSync(pngPath);

  const backdropName = options.name ?? 'Arctic';
  const backdropExt = options.ext ?? 'png';
  const backdropMd5ext = options.md5ext ?? '67e0db3305b3c8bac3a363b1c428892e.png';
  const backdropTags = options.tags ?? [
    'outdoors',
    'cold',
    'north pole',
    'south pole',
    'ice',
    'antarctica',
    'robert hunter'
  ];

  return {
    backdropName,
    backdropExt,
    backdrop,
    backdropMd5ext,
    backdropTags
  };
};

const createNewSound = (options = {}) => {
  const popWavPath = options.path ?? path.join(fixturesDir, 'Pop.wav');
  const sound = fs.readFileSync(popWavPath);

  const soundName = options.name ?? 'Pop';
  const soundExt = options.ext ?? 'wav';
  const soundMd5ext = options.md5ext ?? '83a9787d4cb6f3b7632b4ddfebf74367.wav';
  const soundTags = options.tags ?? [];
  const soundRate = options.rate ?? 44100;
  const soundSampleCount = options.sampleCount ?? 1032;

  return {
    soundName,
    soundExt,
    sound,
    soundMd5ext,
    soundTags,
    soundRate,
    soundSampleCount
  };
};

const createNewCostume = (options = {}) => {
  const costumeSvgPath = options.path ?? path.join(fixturesDir, 'Abby-a.svg');
  const costume = fs.readFileSync(costumeSvgPath);
  const costumeName = options.name ?? 'Abby-a';
  const costumeExt = options.ext ?? 'svg';
  const costumeMd5ext = options.md5ext ?? '809d9b47347a6af2860e7a3a35bce057.svg';
  const costumeTags = options.tags ?? ['people', 'person', 'drawing'];
  const costumeBitmapResolution = options.bitmapResolution ?? 1;
  const costumeRotationCenterX = options.rotationCenterX ?? 31;
  const costumeRotationCenterY = options.rotationCenterY ?? 100;

  return {
    costumeName,
    costumeExt,
    costume,
    costumeMd5ext,
    costumeTags,
    costumeBitmapResolution,
    costumeRotationCenterX,
    costumeRotationCenterY
  };
};

module.exports = {
  generateAsset,
  generateSprite,
  createNewBackdrop,
  createNewSound,
  createNewCostume
};