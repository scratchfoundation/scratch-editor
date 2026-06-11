/* eslint-env jest */
import brushReducer, {changeBrushSize} from '../../src/reducers/brush-mode';
import eraserReducer, {changeBrushSize as changeEraserSize} from '../../src/reducers/eraser-mode';

test('initialState', () => {
    let defaultState;

    expect(brushReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeDefined();
    expect(brushReducer(defaultState /* state */, {type: 'anything'} /* action */).brushSize).toBeGreaterThan(0);

    expect(eraserReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeTruthy();
    expect(eraserReducer(defaultState /* state */, {type: 'anything'} /* action */).brushSize).toBeGreaterThan(0);
});

test('changeBrushSize', () => {
    let defaultState;
    
    const newBrushSize = 8078;

    expect(brushReducer(defaultState /* state */, changeBrushSize(newBrushSize) /* action */))
        .toEqual({brushSize: newBrushSize});
    expect(brushReducer(1 /* state */, changeBrushSize(newBrushSize) /* action */))
        .toEqual({brushSize: newBrushSize});

    expect(eraserReducer(defaultState /* state */, changeEraserSize(newBrushSize) /* action */))
        .toEqual({brushSize: newBrushSize});
    expect(eraserReducer(1 /* state */, changeEraserSize(newBrushSize) /* action */))
        .toEqual({brushSize: newBrushSize});
});

test('invalidChangeBrushSize', () => {
    const origState = {brushSize: 1};

    expect(brushReducer(origState /* state */, changeBrushSize('invalid argument') /* action */))
        .toBe(origState);
    expect(brushReducer(origState /* state */, changeBrushSize() /* action */))
        .toBe(origState);

    expect(eraserReducer(origState /* state */, changeEraserSize('invalid argument') /* action */))
        .toBe(origState);
    expect(eraserReducer(origState /* state */, changeEraserSize() /* action */))
        .toBe(origState);
});
