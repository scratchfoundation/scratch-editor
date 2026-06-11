/* eslint-env jest */
import strokeWidthReducer, {
    MAX_STROKE_WIDTH, changeStrokeWidth
} from '../../src/reducers/stroke-width';
import {setSelectedItems} from '../../src/reducers/selected-items';
import {mockPaperRootItem} from '../__mocks__/paperMocks';

test('initialState', () => {
    let defaultState;

    expect(strokeWidthReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeDefined();
    expect(strokeWidthReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeGreaterThanOrEqual(0);
});

test('changestrokeWidth', () => {
    let defaultState;
    const newstrokeWidth = 23;

    expect(strokeWidthReducer(defaultState /* state */, changeStrokeWidth(newstrokeWidth) /* action */))
        .toEqual(newstrokeWidth);
    expect(strokeWidthReducer(1 /* state */, changeStrokeWidth(newstrokeWidth) /* action */))
        .toEqual(newstrokeWidth);
    expect(strokeWidthReducer(1 /* state */, changeStrokeWidth(-1) /* action */))
        .toEqual(0);
    expect(strokeWidthReducer(1 /* state */, changeStrokeWidth(453452352) /* action */))
        .toEqual(MAX_STROKE_WIDTH);
});

test('changeStrokeWidthViaSelectedItems', () => {
    let defaultState;

    const strokeWidth1 = 6;
    let strokeWidth2; // no outline
    let selectedItems = [mockPaperRootItem({strokeColor: '#000', strokeWidth: strokeWidth1})];
    expect(strokeWidthReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(strokeWidth1);
    selectedItems = [mockPaperRootItem({strokeColor: '#000', strokeWidth: strokeWidth2})];
    expect(strokeWidthReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(0); // Convert no outline to stroke width 0
    selectedItems = [mockPaperRootItem({strokeColor: '#000', strokeWidth: strokeWidth1}),
        mockPaperRootItem({strokeColor: '#000', strokeWidth: strokeWidth2})];
    expect(strokeWidthReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(null); // null indicates mixed for stroke width
});

test('showNoStrokeWidthIfNoStrokeColor', () => {
    let defaultState;

    const selectedItems = [mockPaperRootItem({strokeColor: null, strokeWidth: 10})];
    expect(strokeWidthReducer(defaultState /* state */, setSelectedItems(selectedItems) /* action */))
        .toEqual(0);
});

test('invalidChangestrokeWidth', () => {
    const origState = {strokeWidth: 1};

    expect(strokeWidthReducer(origState /* state */, changeStrokeWidth('invalid argument') /* action */))
        .toBe(origState);
    expect(strokeWidthReducer(origState /* state */, changeStrokeWidth() /* action */))
        .toBe(origState);
});
