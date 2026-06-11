/* eslint-env jest */
import Formats from '../../src/lib/format';
import reducer, {changeFormat} from '../../src/reducers/format';
import {undo, redo} from '../../src/reducers/undo';

test('initialState', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeNull();
});

test('changeFormat', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, changeFormat(Formats.BITMAP) /* action */)).toBe(Formats.BITMAP);
    expect(reducer(Formats.BITMAP /* state */, changeFormat(Formats.BITMAP) /* action */))
        .toBe(Formats.BITMAP);
    expect(reducer(Formats.BITMAP /* state */, changeFormat(Formats.VECTOR) /* action */))
        .toBe(Formats.VECTOR);
});

test('undoRedoChangeFormat', () => {
    let defaultState;
    let reduxState = reducer(defaultState /* state */, changeFormat(Formats.BITMAP) /* action */);
    expect(reduxState).toBe(Formats.BITMAP);
    reduxState = reducer(reduxState /* state */, undo(Formats.BITMAP_SKIP_CONVERT) /* action */);
    expect(reduxState).toBe(Formats.BITMAP_SKIP_CONVERT);
    reduxState = reducer(reduxState /* state */, redo(Formats.VECTOR_SKIP_CONVERT) /* action */);
    expect(reduxState).toBe(Formats.VECTOR_SKIP_CONVERT);
});

test('invalidChangeMode', () => {
    expect(reducer(Formats.BITMAP /* state */, changeFormat('non-existant mode') /* action */))
        .toBe(Formats.BITMAP);
    expect(reducer(Formats.BITMAP /* state */, changeFormat() /* action */)).toBe(Formats.BITMAP);
});
