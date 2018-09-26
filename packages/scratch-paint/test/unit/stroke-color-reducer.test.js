/* eslint-env jest */
import strokeColorReducer from '../../src/reducers/stroke-color';
import {changeStrokeColor} from '../../src/reducers/stroke-color';
import {setSelectedItems} from '../../src/reducers/selected-items';
import {MIXED} from '../../src/helper/style-path';
import {mockPaperRootItem} from '../__mocks__/paperMocks';

test('initialState', () => {
    let defaultState;

    expect(strokeColorReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeDefined();
});

test('changeStrokeColor', () => {
    let defaultState;

    // 3 value hex code
    let newStrokeColor = '#fff';
    expect(strokeColorReducer(defaultState /* state */, changeStrokeColor(newStrokeColor) /* action */))
        .toEqual(newStrokeColor);
    expect(strokeColorReducer('#010' /* state */, changeStrokeColor(newStrokeColor) /* action */))
        .toEqual(newStrokeColor);

    // 6 value hex code
    newStrokeColor = '#facade';
    expect(strokeColorReducer(defaultState /* state */, changeStrokeColor(newStrokeColor) /* action */))
        .toEqual(newStrokeColor);
    expect(strokeColorReducer('#010' /* state */, changeStrokeColor(newStrokeColor) /* action */))
        .toEqual(newStrokeColor);
});

test('changeStrokeColorViaSelectedItems', () => {
    let defaultState;

    const strokeColor1 = 6;
    const strokeColor2 = null; // transparent
    let selectedItems = [mockPaperRootItem({strokeColor: strokeColor1, strokeWidth: 1})];
    expect(strokeColorReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(strokeColor1);
    selectedItems = [mockPaperRootItem({strokeColor: strokeColor2, strokeWidth: 1})];
    expect(strokeColorReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(strokeColor2);
    selectedItems = [mockPaperRootItem({strokeColor: strokeColor1, strokeWidth: 1}),
        mockPaperRootItem({strokeColor: strokeColor2, strokeWidth: 1})];
    expect(strokeColorReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(MIXED);
});

test('showNoStrokeColorIfNoStrokeWidth', () => {
    let defaultState;

    let selectedItems = [mockPaperRootItem({strokeColor: '#fff', strokeWidth: null})];
    expect(strokeColorReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(null);
    selectedItems = [mockPaperRootItem({strokeColor: '#fff', strokeWidth: 0})];
    expect(strokeColorReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(null);
});

test('invalidChangeStrokeColor', () => {
    const origState = '#fff';

    expect(strokeColorReducer(origState /* state */, changeStrokeColor() /* action */))
        .toBe(origState);
    expect(strokeColorReducer(origState /* state */, changeStrokeColor('#') /* action */))
        .toBe(origState);
    expect(strokeColorReducer(origState /* state */, changeStrokeColor('#1') /* action */))
        .toBe(origState);
    expect(strokeColorReducer(origState /* state */, changeStrokeColor('#12') /* action */))
        .toBe(origState);
    expect(strokeColorReducer(origState /* state */, changeStrokeColor('#1234') /* action */))
        .toBe(origState);
    expect(strokeColorReducer(origState /* state */, changeStrokeColor('#12345') /* action */))
        .toBe(origState);
    expect(strokeColorReducer(origState /* state */, changeStrokeColor('#1234567') /* action */))
        .toBe(origState);
    expect(strokeColorReducer(origState /* state */, changeStrokeColor('invalid argument') /* action */))
        .toBe(origState);
});
