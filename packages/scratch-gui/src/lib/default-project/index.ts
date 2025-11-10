import projectData from './project-data';
import {TranslatorFunction} from '../../gui-config';

 
import popWav from '!arraybuffer-loader!./83a9787d4cb6f3b7632b4ddfebf74367.wav?';
import meowWav from '!arraybuffer-loader!./83c36d806dc92327b9e7049a565c6bff.wav?';
import backdrop from '!raw-loader!./cd21514d0531fdffb22204e0ec5ed84a.svg?';
import costume1 from '!raw-loader!./bcf454acf82e4504149f7ffe07081dbc.svg?';
import costume2 from '!raw-loader!./0fb9be3e8397c983338cb71dc84d0b25.svg?';
 

declare function require(path: 'fastestsmallesttextencoderdecoder'): { TextEncoder: typeof TextEncoder };

const defaultProject = (translator?: TranslatorFunction) => {
    let _TextEncoder: typeof TextEncoder;
    if (typeof TextEncoder === 'undefined') {
        _TextEncoder = require('fastestsmallesttextencoderdecoder').TextEncoder;
    } else {
        _TextEncoder = TextEncoder;
    }
    const encoder = new _TextEncoder();

    const projectJson = projectData(translator);
    return [{
        // TODO: This is weird - the ids are annotated by scratch-storage to be strigns, but
        //       this one is an int. May have implications on checking with `!` and in conditions,
        //       so leaving it as is for now.
        id: 0,
        assetType: 'Project',
        dataFormat: 'JSON',
        data: JSON.stringify(projectJson)
    }, {
        id: '83a9787d4cb6f3b7632b4ddfebf74367',
        assetType: 'Sound',
        dataFormat: 'WAV',
        data: new Uint8Array(popWav)
    }, {
        id: '83c36d806dc92327b9e7049a565c6bff',
        assetType: 'Sound',
        dataFormat: 'WAV',
        data: new Uint8Array(meowWav)
    }, {
        id: 'cd21514d0531fdffb22204e0ec5ed84a',
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(backdrop)
    }, {
        id: 'bcf454acf82e4504149f7ffe07081dbc',
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(costume1)
    }, {
        id: '0fb9be3e8397c983338cb71dc84d0b25',
        assetType: 'ImageVector',
        dataFormat: 'SVG',
        data: encoder.encode(costume2)
    }];
};

export default defaultProject;
