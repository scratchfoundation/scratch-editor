/* eslint-env jest */
import lineReducer from '../../src/reducers/line-mode';
import {changeLineWidth} from '../../src/reducers/line-mode';

test('initialState', () => {
    let defaultState;

    expect(lineReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeDefined();
    expect(lineReducer(defaultState /* state */, {type: 'anything'} /* action */).lineWidth).toBeGreaterThan(0);
});

test('changeLineWidth', () => {
    let defaultState;
    const newLineWidth = 8078;

    expect(lineReducer(defaultState /* state */, changeLineWidth(newLineWidth) /* action */))
        .toEqual({lineWidth: newLineWidth});
    expect(lineReducer(2 /* state */, changeLineWidth(newLineWidth) /* action */))
        .toEqual({lineWidth: newLineWidth});
    expect(lineReducer(2 /* state */, changeLineWidth(-1) /* action */))
        .toEqual({lineWidth: 1});
});

test('invalidChangeLineWidth', () => {
    const origState = {lineWidth: 2};

    expect(lineReducer(origState /* state */, changeLineWidth('invalid argument') /* action */))
        .toBe(origState);
    expect(lineReducer(origState /* state */, changeLineWidth() /* action */))
        .toBe(origState);
});
