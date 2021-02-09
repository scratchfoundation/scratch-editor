/* eslint-env jest */
import Modes from '../../src/lib/modes';
import reducer, {changeMode} from '../../src/reducers/modes';

test('initialState', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, {type: 'anything'} /* action */) in Modes).toBeTruthy();
});

test('changeMode', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, changeMode(Modes.ERASER) /* action */)).toBe(Modes.ERASER);
    expect(reducer(Modes.ERASER /* state */, changeMode(Modes.ERASER) /* action */))
        .toBe(Modes.ERASER);
    expect(reducer(Modes.BRUSH /* state */, changeMode(Modes.ERASER) /* action */))
        .toBe(Modes.ERASER);
});

test('invalidChangeMode', () => {
    expect(reducer(Modes.BRUSH /* state */, changeMode('non-existant mode') /* action */))
        .toBe(Modes.BRUSH);
    expect(reducer(Modes.BRUSH /* state */, changeMode() /* action */)).toBe(Modes.BRUSH);
});
