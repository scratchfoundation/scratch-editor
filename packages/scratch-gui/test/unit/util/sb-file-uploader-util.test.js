import {getProjectTitleFromFilename} from '../../../src/lib/sb-file-uploader-utils';

describe('getProjectTitleFromFilename', () => {
    test('correctly sets title with .sb3 filename', () => {
        const projectName = getProjectTitleFromFilename('my project is great.sb3');
        expect(projectName).toBe('my project is great');
    });
    
    test('correctly sets title with .sb2 filename', () => {
        const projectName = getProjectTitleFromFilename('my project is great.sb2');
        expect(projectName).toBe('my project is great');
    });
    
    test('correctly sets title with .sb filename', () => {
        const projectName = getProjectTitleFromFilename('my project is great.sb');
        expect(projectName).toBe('my project is great');
    });
    
    test('sets blank title with filename with no extension', () => {
        const projectName = getProjectTitleFromFilename('my project is great');
        expect(projectName).toBe('');
    });
});
