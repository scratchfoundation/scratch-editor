/* eslint-env jest */
import selectedItemsReducer, {
    setSelectedItems, clearSelectedItems
} from '../../src/reducers/selected-items';

test('initialState', () => {
    let defaultState;

    expect(selectedItemsReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeDefined();
});

test('setSelectedItems', () => {
    let defaultState;

    const newSelected1 = ['selected1', 'selected2'];
    const newSelected2 = ['selected1', 'selected3'];
    const unselected = [];
    expect(selectedItemsReducer(defaultState /* state */, setSelectedItems(newSelected1) /* action */))
        .toEqual(newSelected1);
    expect(selectedItemsReducer(newSelected1, setSelectedItems(newSelected2) /* action */))
        .toEqual(newSelected2);
    expect(selectedItemsReducer(newSelected1, setSelectedItems(unselected) /* action */))
        .toEqual(unselected);
    expect(selectedItemsReducer(defaultState, setSelectedItems(unselected) /* action */))
        .toEqual(unselected);
});

test('clearSelectedItems', () => {
    let defaultState;

    const selectedState = ['selected1', 'selected2'];
    const unselectedState = [];
    expect(selectedItemsReducer(defaultState /* state */, clearSelectedItems() /* action */))
        .toHaveLength(0);
    expect(selectedItemsReducer(selectedState /* state */, clearSelectedItems() /* action */))
        .toHaveLength(0);
    expect(selectedItemsReducer(unselectedState /* state */, clearSelectedItems() /* action */))
        .toHaveLength(0);
});

test('invalidsetSelectedItems', () => {
    const origState = ['selected1', 'selected2'];

    expect(selectedItemsReducer(origState /* state */, setSelectedItems() /* action */))
        .toBe(origState);
    expect(selectedItemsReducer(origState /* state */, setSelectedItems('notAnArray') /* action */))
        .toBe(origState);
});
