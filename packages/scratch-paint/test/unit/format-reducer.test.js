/* eslint-env jest */
import Formats from '../../src/lib/format';
import reducer from '../../src/reducers/format';
import {changeFormat} from '../../src/reducers/format';

test('initialState', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, {type: 'anything'} /* action */) in Formats).toBeTruthy();
});

test('changeFormat', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, changeFormat(Formats.BITMAP) /* action */)).toBe(Formats.BITMAP);
    expect(reducer(Formats.BITMAP /* state */, changeFormat(Formats.BITMAP) /* action */))
        .toBe(Formats.BITMAP);
    expect(reducer(Formats.BITMAP /* state */, changeFormat(Formats.VECTOR) /* action */))
        .toBe(Formats.VECTOR);
});

test('invalidChangeMode', () => {
    expect(reducer(Formats.BITMAP /* state */, changeFormat('non-existant mode') /* action */))
        .toBe(Formats.BITMAP);
    expect(reducer(Formats.BITMAP /* state */, changeFormat() /* action */)).toBe(Formats.BITMAP);
});
