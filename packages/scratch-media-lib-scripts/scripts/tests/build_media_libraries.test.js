const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { buildLibraries } = require('../build_media_libraries');
const fixturesDir = path.resolve(__dirname, 'fixtures'); // Directory for test fixtures

const { generateAsset, generateSprite, createNewBackdrop, createNewSound, createNewCostume } = require('./helpers/input-helpers');

const tempInputDir = path.join(os.tmpdir(), 'media-lib-test-input');

describe('buildLibraries', () => {
  beforeEach(() => {
    // Clean and recreate temp input directory before each test
    if (fs.existsSync(tempInputDir)) {
      fs.rmSync(tempInputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempInputDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup temp input and output directories after all tests
    if (fs.existsSync(tempInputDir)) {
      fs.rmSync(tempInputDir, { recursive: true, force: true });
    }
  });

  test('Should return empty collections for empty input directory', () => {
    const result = buildLibraries({ inputDir: tempInputDir });
    expect(result).toEqual({
      sprites: [],
      backdrops: [],
      costumes: [],
      sounds: []
    });
  });

  test('Should process a backdrop correctly', () => {
    const {
      backdropName,
      backdrop,
      backdropMd5ext,
      backdropTags,
      backdropExt
    } = createNewBackdrop();

    generateAsset(
      tempInputDir,
      'backdrops',
      backdrop, {
      name: backdropName,
      ext: backdropExt,
      tags: backdropTags
    }
    );

    const result = buildLibraries({ inputDir: tempInputDir });

    expect(result.backdrops).toHaveLength(1);
    expect(result.backdrops[0].name).toBe(backdropName);
    expect(result.backdrops[0].md5ext).toBe(backdropMd5ext);
    expect(result.backdrops[0].tags).toEqual(backdropTags);
    expect(result.backdrops[0].dataFormat).toBe(backdropExt);
  });

  test('Should process a sound correctly', () => {
    const {
      soundName,
      sound,
      soundMd5ext,
      soundTags,
      soundExt,
      soundRate,
      soundSampleCount
    } = createNewSound();

    generateAsset(
      tempInputDir,
      'sounds',
      sound, {
      name: soundName,
      ext: soundExt,
      tags: soundTags,
      rate: soundRate,
      sampleCount: soundSampleCount
    }
    );

    const result = buildLibraries({ inputDir: tempInputDir });

    expect(result.sounds).toHaveLength(1);
    expect(result.sounds[0].name).toBe(soundName);
    expect(result.sounds[0].md5ext).toBe(soundMd5ext);
    expect(result.sounds[0].tags).toEqual(soundTags);
    expect(result.sounds[0].rate).toBe(soundRate);
    expect(result.sounds[0].sampleCount).toBe(soundSampleCount);
    expect(result.sounds[0].dataFormat).toBe(soundExt);
  });

  test('Should process a costume correctly', () => {
    const {
      costumeName,
      costume,
      costumeMd5ext,
      costumeTags,
      costumeExt
    } = createNewCostume();

    generateAsset(
      tempInputDir,
      'costumes',
      costume, {
      name: costumeName,
      ext: costumeExt,
      tags: costumeTags
    }
    );

    const result = buildLibraries({ inputDir: tempInputDir });

    expect(result.costumes).toHaveLength(1);
    expect(result.costumes[0].name).toBe(costumeName);
    expect(result.costumes[0].md5ext).toBe(costumeMd5ext);
    expect(result.costumes[0].tags).toEqual(costumeTags);
    expect(result.costumes[0].dataFormat).toBe(costumeExt);
  });

  test('Should process a sprite and fill costumes correctly', () => {
    const spriteName = 'Abby';
    const {
      costumeName,
      costume,
      costumeMd5ext,
      costumeExt,
      costumeBitmapResolution,
      costumeRotationCenterX,
      costumeRotationCenterY
    } = createNewCostume();

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeExt,
          data: costume,
          jsonOptions: {
            bitmapResolution: costumeBitmapResolution,
            rotationCenterX: costumeRotationCenterX,
            rotationCenterY: costumeRotationCenterY
          }
        }
      },
      {},
      {
        name: spriteName
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir });

    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].name).toBe(spriteName);
    expect(result.sprites[0].costumes).toHaveLength(1);
    expect(result.sprites[0].costumes[0].name).toBe(costumeName);
    expect(result.sprites[0].costumes[0].md5ext).toBe(costumeMd5ext);
    expect(result.sprites[0].costumes[0].bitmapResolution).toBe(costumeBitmapResolution);
    expect(result.sprites[0].costumes[0].rotationCenterX).toBe(costumeRotationCenterX);
    expect(result.sprites[0].costumes[0].rotationCenterY).toBe(costumeRotationCenterY);
  });

  test('Should process a sprite and fill sounds correctly', () => {
    const spriteName = 'Abby';

    const {
      soundName,
      sound,
      soundMd5ext,
      soundExt,
      soundRate,
      soundSampleCount
    } = createNewSound();

    generateSprite(
      tempInputDir,
      {},
      {
        [soundName]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir });

    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].name).toBe(spriteName);

    expect(result.sprites[0].sounds).toHaveLength(1);
    expect(result.sprites[0].sounds[0].name).toBe(soundName);
    expect(result.sprites[0].sounds[0].md5ext).toBe(soundMd5ext);
    expect(result.sprites[0].sounds[0].rate).toBe(soundRate);
    expect(result.sprites[0].sounds[0].sampleCount).toBe(soundSampleCount);
    expect(result.sprites[0].sounds[0].dataFormat).toBe(soundExt);
  });

  test('Should preserve additional properties on sprites', () => {
    const spriteName = 'Abby';
    const variables = {
      myVariable: {
        value: 10
      }
    };

    const blocks = {
      moveSteps: {
        inputs: {
          STEPS: {
            name: 'steps',
            value: 10
          }
        }
      }
    };

    generateSprite(
      tempInputDir,
      {},
      {},
      {
        name: spriteName,
        isStage: true,
        tags: ['people', 'person', 'drawing'],
        variables,
        blocks
      },
    );

    const result = buildLibraries({ inputDir: tempInputDir });

    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].name).toBe(spriteName);
    expect(result.sprites[0].isStage).toBe(true);
    expect(result.sprites[0].tags).toEqual(['people', 'person', 'drawing']);
    expect(result.sprites[0].variables).toEqual(variables);
    expect(result.sprites[0].blocks).toEqual(blocks);
  });

  test('Should inherit costume tags from sprites', () => {
    const spriteName = 'Abby';
    const spriteTags = [
      'people',
      'person',
      'drawing'
    ];

    const {
      costumeName,
      costume,
      costumeExt,
      costumeBitmapResolution,
      costumeRotationCenterX,
      costumeRotationCenterY
    } = createNewCostume();

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeExt,
          data: costume,
          jsonOptions: {
            bitmapResolution: costumeBitmapResolution,
            rotationCenterX: costumeRotationCenterX,
            rotationCenterY: costumeRotationCenterY
          }
        }
      },
      {},
      {
        name: spriteName,
        tags: spriteTags
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir });

    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].name).toBe(spriteName);
    expect(result.sprites[0].tags).toEqual(spriteTags);
    expect(result.sprites[0].costumes).toHaveLength(1);
    expect(result.sprites[0].costumes[0].name).toBe(costumeName);
    expect(result.sprites[0].costumes[0].tags).toEqual(spriteTags); // Inherited from sprite
  });

  test('Should NOT inherit costume tags from sprites if costume already has tags', () => {
    const spriteName = 'Abby';
    const spriteTags = [
      'people',
      'person',
      'drawing'
    ];

    const costumeTags = [
      'cat',
      'pet'
    ];

    const {
      costumeName,
      costume,
      costumeExt,
      costumeBitmapResolution,
      costumeRotationCenterX,
      costumeRotationCenterY
    } = createNewCostume({ tags: costumeTags });

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeExt,
          data: costume,
          jsonOptions: {
            bitmapResolution: costumeBitmapResolution,
            rotationCenterX: costumeRotationCenterX,
            rotationCenterY: costumeRotationCenterY,
            tags: costumeTags
          }
        }
      },
      {},
      {
        name: spriteName,
        tags: spriteTags
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir });
    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].name).toBe(spriteName);
    expect(result.sprites[0].tags).toEqual(spriteTags);
    expect(result.sprites[0].costumes).toHaveLength(1);
    expect(result.sprites[0].costumes[0].name).toBe(costumeName);
    expect(result.sprites[0].costumes[0].tags).toEqual(costumeTags); // Should NOT inherit tags since costume already has its own tags
  });

  test('Should NOT inherit sound tags from sprites', () => {
    const spriteName = 'Abby';
    const spriteTags = [
      'people',
      'person',
      'drawing'
    ];

    const {
      soundName,
      sound,
      soundExt,
      soundRate,
      soundSampleCount
    } = createNewSound();

    generateSprite(
      tempInputDir,
      {},
      {
        [soundName]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName,
        tags: spriteTags
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir });

    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].name).toBe(spriteName);
    expect(result.sprites[0].tags).toEqual(spriteTags);
    expect(result.sprites[0].sounds).toHaveLength(1);
    expect(result.sprites[0].sounds[0].name).toBe(soundName);
    expect(result.sprites[0].sounds[0].tags).toEqual([]); // Should NOT inherit tags
  });

  test('Should fill global costumes from sprites if fillAssetsFromSprites is true', () => {
    const spriteName = 'Abby';
    const spriteTags = [
      'people',
      'person',
      'drawing'
    ];
    const {
      costumeName,
      costume,
      costumeExt,
      costumeMd5ext,
      costumeBitmapResolution,
      costumeRotationCenterX,
      costumeRotationCenterY
    } = createNewCostume();

    const {
      soundName,
      sound,
      soundExt,
      soundMd5ext,
      soundRate,
      soundSampleCount
    } = createNewSound();

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeExt,
          data: costume,
          jsonOptions: {
            bitmapResolution: costumeBitmapResolution,
            rotationCenterX: costumeRotationCenterX,
            rotationCenterY: costumeRotationCenterY
          }
        }
      },
      {
        [soundName]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName,
        tags: spriteTags
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: true });

    expect(result.sprites).toHaveLength(1);
    expect(result.costumes).toHaveLength(1); // Should be added to global costumes
    expect(result.sounds).toHaveLength(1); // Should be added to global sounds
    expect(result.costumes[0].name).toBe(costumeName);
    expect(result.costumes[0].md5ext).toBe(costumeMd5ext);
    expect(result.costumes[0].bitmapResolution).toBe(costumeBitmapResolution);
    expect(result.costumes[0].rotationCenterX).toBe(costumeRotationCenterX);
    expect(result.costumes[0].rotationCenterY).toBe(costumeRotationCenterY);
    expect(result.costumes[0].tags).toEqual(spriteTags); // Inherited from sprite
    expect(result.sounds[0].name).toBe(soundName);
    expect(result.sounds[0].md5ext).toBe(soundMd5ext);
    expect(result.sounds[0].rate).toBe(soundRate);
    expect(result.sounds[0].sampleCount).toBe(soundSampleCount);
    expect(result.sounds[0].dataFormat).toBe(soundExt);
  });

  test('Should NOT fill global assets from sprites if fillAssetsFromSprites is false', () => {
    const spriteName = 'Abby';
    const spriteTags = [
      'people',
      'person',
      'drawing'
    ];
    const {
      costumeName,
      costume,
      costumeExt,
      costumeBitmapResolution,
      costumeRotationCenterX,
      costumeRotationCenterY
    } = createNewCostume();

    const {
      soundName,
      sound,
      soundExt,
      soundRate,
      soundSampleCount
    } = createNewSound();

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeExt,
          data: costume,
          jsonOptions: {
            bitmapResolution: costumeBitmapResolution,
            rotationCenterX: costumeRotationCenterX,
            rotationCenterY: costumeRotationCenterY
          }
        }
      },
      {
        [soundName]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName,
        tags: spriteTags
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: false });

    expect(result.sprites).toHaveLength(1);
    expect(result.sounds).toHaveLength(0); // Should be empty
    expect(result.costumes).toHaveLength(0); // Should be empty
  });

  test('Should fill sounds from global libraries even when fillAssetsFromSprites is false', () => {
    const spriteName = 'Abby';
    const soundNameInSprite = 'Pop-sprite';
    const {
      soundName: soundNameInAsset,
      sound,
      soundExt,
      soundMd5ext,
      soundRate,
      soundSampleCount
    } = createNewSound({ name: 'Pop-asset' });

    generateAsset(
      tempInputDir,
      'sounds',
      sound,
      {
        name: soundNameInAsset,
        ext: soundExt,
        tags: [],
        rate: soundRate,
        sampleCount: soundSampleCount,
      }
    );

    generateSprite(
      tempInputDir,
      {},
      {
        [soundNameInSprite]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName,
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: false });

    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].sounds).toHaveLength(1);
    expect(result.sprites[0].sounds[0].name).toBe(soundNameInSprite);
    expect(result.sprites[0].sounds[0].md5ext).toBe(soundMd5ext);
    expect(result.sounds).toHaveLength(1); // Should still include sound from global library
    expect(result.sounds[0].name).toBe(soundNameInAsset);
    expect(result.sounds[0].md5ext).toBe(soundMd5ext);
  });

  test('Should handle duplicate asset names in different sprites by including only one in the global library', () => {
    const spriteName1 = 'Abby 1';
    const spriteName2 = 'Abby 2';

    const {
      costumeName,
      costume,
      costumeMd5ext
    } = createNewCostume();

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeMd5ext,
          data: costume,
          jsonOptions: {}
        }
      },
      {},
      {
        name: spriteName1
      }
    );

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeMd5ext,
          data: costume,
          jsonOptions: {}
        }
      },
      {},
      {
        name: spriteName2
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: true });

    expect(result.sprites).toHaveLength(2);
    expect(result.costumes).toHaveLength(1); // Only one costume should be in global lib since names and files match
    expect(result.costumes[0].name).toBe(costumeName);
    expect(result.costumes[0].md5ext).toBe(costumeMd5ext);
  });

  test('Should deduplicate assets with the same name, ignoring casing', () => {
    const spriteName1 = 'Abby 1';
    const spriteName2 = 'Abby 2';

    const {
      soundName: soundName1,
      sound,
      soundExt,
      soundRate,
      soundSampleCount
    } = createNewSound({ name: 'Pop' });

    const soundName2 = 'pop';

    generateSprite(
      tempInputDir,
      {},
      {
        [soundName1]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName1
      }
    );

    generateSprite(
      tempInputDir,
      {},
      {
        [soundName2]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName2
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: true });

    expect(result.sprites).toHaveLength(2);
    expect(result.sounds).toHaveLength(1); // Only one sound should be in global lib since names match ignoring case
    expect(result.sounds[0].name).toBe(soundName1); // Should keep the first one encountered
    expect(result.sprites[0].sounds[0].name).toBe(soundName1); // Sprites should still refer to the original name
    expect(result.sprites[1].sounds[0].name).toBe(soundName2);
  });

  test('Should handle multiple sprites with same costume name but different files', () => {
    const spriteName1 = 'Abby 1';
    const spriteName2 = 'Abby 2';

    const {
      costumeName,
      costumeExt,
      costumeMd5ext: costumeMd5ext1,
      costume: costume1
    } = createNewCostume({ name: 'commonCostume' });

    const {
      costumeMd5ext: costumeMd5ext2,
      costume: costume2
    } = createNewCostume({
      name: 'commonCostume',
      path: path.join(fixturesDir, 'Abby-b.svg'),
      md5ext: '920f14335615fff9b8c55fccb8971984.svg'
    });

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeExt,
          data: costume1,
          jsonOptions: {}
        }
      },
      {},
      {
        name: spriteName1
      }
    );

    generateSprite(
      tempInputDir,
      {
        [costumeName]: {
          ext: costumeExt,
          data: costume2,
          jsonOptions: {}
        }
      },
      {},
      {
        name: spriteName2
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: true });

    expect(result.sprites).toHaveLength(2);
    expect(result.sprites[0].costumes).toHaveLength(1);
    expect(result.sprites[0].costumes[0].name).toBe(costumeName);
    expect(result.sprites[0].costumes[0].md5ext).toBe(costumeMd5ext1);
    expect(result.sprites[1].costumes).toHaveLength(1);
    expect(result.sprites[1].costumes[0].name).toBe(costumeName);
    expect(result.sprites[1].costumes[0].md5ext).toBe(costumeMd5ext2);

    expect(result.costumes).toHaveLength(2); // Both costumes should be in global lib since the key-name pair differs due to different md5ext, even though names are the same

    const costumeMd5exts = result.costumes.map(c => c.md5ext);

    expect(costumeMd5exts).toContain(costumeMd5ext1);
    expect(costumeMd5exts).toContain(costumeMd5ext2);

    result.costumes.forEach(c => {
      expect(c.name).toBe(costumeName);
    });
  });

  test('Should handle multiple sprites with same asset md5key but different names', () => {
    const spriteName1 = 'Abby 1';
    const spriteName2 = 'Abby 2';

    const {
      soundName: soundName1,
      soundExt,
      sound,
      soundMd5ext,
      soundRate,
      soundSampleCount
    } = createNewSound({ name: 'Pop-a' });

    const soundName2 = 'Pop-b';

    generateSprite(
      tempInputDir,
      {},
      {
        [soundName1]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName1
      }
    );

    generateSprite(
      tempInputDir,
      {},
      {
        [soundName2]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount
          }
        }
      },
      {
        name: spriteName2
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: true });

    expect(result.sprites).toHaveLength(2);
    expect(result.sprites[0].sounds).toHaveLength(1);
    expect(result.sprites[0].sounds[0].name).toBe(soundName1);
    expect(result.sprites[0].sounds[0].md5ext).toBe(soundMd5ext);
    expect(result.sprites[1].sounds).toHaveLength(1);
    expect(result.sprites[1].sounds[0].name).toBe(soundName2);
    expect(result.sprites[1].sounds[0].md5ext).toBe(soundMd5ext);

    expect(result.sounds).toHaveLength(2); // Both sounds should be in global lib since names are different, even though files are the same
    const soundNames = result.sounds.map(s => s.name);
    expect(soundNames).toContain(soundName1);
    expect(soundNames).toContain(soundName2);
  });

  test('Should always extract dataFormat from file extension', () => {
    const spriteName = 'Abby';
    const {
      sound,
      soundName,
      soundExt,
      soundMd5ext,
      soundRate,
      soundSampleCount
    } = createNewSound({ name: 'Pop' });

    generateSprite(
      tempInputDir,
      {},
      {
        [soundName]: {
          ext: soundExt,
          data: sound,
          jsonOptions: {
            rate: soundRate,
            sampleCount: soundSampleCount,
            dataFormat: 'adpcm',
            format: 'adpcm' // Also include format for good measure to test that we ignore it as well
          }
        }
      },
      {
        name: spriteName
      }
    );

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: true });

    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].name).toBe(spriteName);
    expect(result.sprites[0].sounds).toHaveLength(1);
    expect(result.sprites[0].sounds[0].name).toBe(soundName);
    expect(result.sprites[0].sounds[0].md5ext).toBe(soundMd5ext);
    expect(result.sprites[0].sounds[0].rate).toBe(soundRate);
    expect(result.sprites[0].sounds[0].sampleCount).toBe(soundSampleCount);
    expect(result.sprites[0].sounds[0].dataFormat).toBe(soundExt); // Should use file extension, not provided dataFormat or format
    expect(result.sprites[0].sounds[0].format).toBeUndefined(); // format should be removed from final output

    expect(result.sounds).toHaveLength(1);
    expect(result.sounds[0].name).toBe(soundName);
    expect(result.sounds[0].md5ext).toBe(soundMd5ext);
    expect(result.sounds[0].rate).toBe(soundRate);
    expect(result.sounds[0].sampleCount).toBe(soundSampleCount);
    expect(result.sounds[0].dataFormat).toBe(soundExt); // Should use file extension, not provided dataFormat or format
    expect(result.sounds[0].format).toBeUndefined(); // format should be removed from final output
  });

  test('Should handle invalid JSON files gracefully', () => {
    const spriteName = 'InvalidSprite';
    const spriteDir = path.join(tempInputDir, 'sprites', spriteName);

    fs.mkdirSync(spriteDir, { recursive: true });
    fs.writeFileSync(path.join(spriteDir, `${spriteName}.json5`), '{ invalid json }'); // Invalid JSON

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: true });

    expect(result.sprites).toHaveLength(0); // Should skip invalid sprite
  });

  test('Should handle missing files gracefully', () => {
    const spriteName = 'MissingFilesSprite';
    const costumeName = 'NonExistentCostume';
    const soundName = 'NonExistentSound';

    const spriteDir = path.join(tempInputDir, 'sprites', spriteName);
    fs.mkdirSync(spriteDir, { recursive: true });
    const jsonContent = {
      '$schema': '../../schemas/media-collection-schema.json',
      sprites: [{
        name: spriteName,
        costumes: [costumeName],
        sounds: [soundName]
      }],
      costumes: [{
        name: costumeName,
        file: `${costumeName}.svg`
      }],
      sounds: [{
        name: soundName,
        file: `${soundName}.wav`
      }]
    };
    fs.writeFileSync(path.join(spriteDir, `${spriteName}.json5`), JSON.stringify(jsonContent));

    const result = buildLibraries({ inputDir: tempInputDir, fillAssetsFromSprites: true });
    expect(result.sprites).toHaveLength(1);
    expect(result.sprites[0].name).toBe(spriteName);
    expect(result.sprites[0].costumes).toHaveLength(0); // Should skip missing costume
    expect(result.sprites[0].sounds).toHaveLength(0); // Should skip missing sound
    expect(result.costumes).toHaveLength(0); // Should not include missing costume in global library
    expect(result.sounds).toHaveLength(0); // Should not include missing sound in global library
  });
});
