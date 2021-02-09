/* eslint-env jest */
import clipboardReducer, {
    clearPasteOffset, incrementPasteOffset, setClipboardItems
} from '../../src/reducers/clipboard';

test('initialState', () => {
    let defaultState;

    expect(clipboardReducer(defaultState /* state */, {type: 'anything'} /* action */).items).toBeDefined();
    expect(clipboardReducer(defaultState /* state */, {type: 'anything'} /* action */).pasteOffset).toBeDefined();
});

test('setClipboardItems', () => {
    let defaultState;

    const newSelected1 = ['selected1', 'selected2'];
    const newSelected2 = ['selected1', 'selected3'];
    expect(clipboardReducer(defaultState /* state */, setClipboardItems(newSelected1) /* action */).items)
        .toEqual(newSelected1);
    expect(clipboardReducer(defaultState /* state */, setClipboardItems(newSelected1) /* action */).pasteOffset)
        .toEqual(1);
    expect(clipboardReducer(newSelected1, setClipboardItems(newSelected2) /* action */).items)
        .toEqual(newSelected2);
    expect(clipboardReducer(defaultState /* state */, setClipboardItems(newSelected1) /* action */).pasteOffset)
        .toEqual(1);
});

test('incrementPasteOffset', () => {
    const origState = {
        items: ['selected1', 'selected2'],
        pasteOffset: 1
    };

    expect(clipboardReducer(origState /* state */, incrementPasteOffset() /* action */).pasteOffset)
        .toEqual(2);
    expect(clipboardReducer(origState, incrementPasteOffset() /* action */).items)
        .toEqual(origState.items);
});

test('clearPasteOffset', () => {
    const origState = {
        items: ['selected1', 'selected2'],
        pasteOffset: 1
    };

    expect(clipboardReducer(origState /* state */, clearPasteOffset() /* action */).pasteOffset)
        .toEqual(0);
    expect(clipboardReducer(origState, clearPasteOffset() /* action */).items)
        .toEqual(origState.items);
});

test('invalidSetClipboardItems', () => {
    const origState = {
        items: ['selected1', 'selected2'],
        pasteOffset: 1
    };
    const nothingSelected = [];

    expect(clipboardReducer(origState /* state */, setClipboardItems() /* action */))
        .toBe(origState);
    expect(clipboardReducer(origState /* state */, setClipboardItems('notAnArray') /* action */))
        .toBe(origState);
    expect(clipboardReducer(origState /* state */, setClipboardItems(nothingSelected) /* action */))
        .toBe(origState);
});
