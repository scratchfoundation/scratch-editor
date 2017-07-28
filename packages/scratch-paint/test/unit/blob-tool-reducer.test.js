/* eslint-env jest */
import brushReducer from '../../src/reducers/brush-tool';
import eraserReducer from '../../src/reducers/eraser-tool';

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

    expect(brushReducer(defaultState /* state */, brushReducer.changeBrushSize(newBrushSize) /* action */))
        .toEqual({brushSize: newBrushSize});
    expect(brushReducer(1 /* state */, brushReducer.changeBrushSize(newBrushSize) /* action */))
        .toEqual({brushSize: newBrushSize});

    expect(eraserReducer(defaultState /* state */, eraserReducer.changeBrushSize(newBrushSize) /* action */))
        .toEqual({brushSize: newBrushSize});
    expect(eraserReducer(1 /* state */, eraserReducer.changeBrushSize(newBrushSize) /* action */))
        .toEqual({brushSize: newBrushSize});
});

test('invalidChangeBrushSize', () => {
    const origState = {brushSize: 1};

    expect(brushReducer(origState /* state */, brushReducer.changeBrushSize('invalid argument') /* action */))
        .toBe(origState);
    expect(brushReducer(origState /* state */, brushReducer.changeBrushSize() /* action */))
        .toBe(origState);

    expect(eraserReducer(origState /* state */, eraserReducer.changeBrushSize('invalid argument') /* action */))
        .toBe(origState);
    expect(eraserReducer(origState /* state */, eraserReducer.changeBrushSize() /* action */))
        .toBe(origState);
});
