/* eslint-env jest */
import ToolTypes from '../../src/tools/tool-types';
import reducer from '../../src/reducers/tools';

test('initialState', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, {type: 'anything'} /* action */) instanceof ToolTypes).toBeTruthy();
});

test('changeTool', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, reducer.changeTool(ToolTypes.ERASER) /* action */)).toBe(ToolTypes.ERASER);
    expect(reducer(ToolTypes.ERASER /* state */, reducer.changeTool(ToolTypes.ERASER) /* action */))
        .toBe(ToolTypes.ERASER);
    expect(reducer(ToolTypes.BRUSH /* state */, reducer.changeTool(ToolTypes.ERASER) /* action */))
        .toBe(ToolTypes.ERASER);
});

test('invalidChangeTool', () => {
    expect(reducer(ToolTypes.BRUSH /* state */, reducer.changeTool('non-existant tool') /* action */))
    .toBe(ToolTypes.BRUSH);
    expect(reducer(ToolTypes.BRUSH /* state */, reducer.changeTool() /* action */)).toBe(ToolTypes.BRUSH);
});
