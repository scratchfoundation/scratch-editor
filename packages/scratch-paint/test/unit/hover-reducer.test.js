/* eslint-env jest */
import paper from 'paper';
import reducer from '../../src/reducers/hover';
import {clearHoveredItem, setHoveredItem} from '../../src/reducers/hover';

beforeEach(() => {
    paper.setup();
});

test('initialState', () => {
    let defaultState;
    expect(reducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeNull();
});

test('setHoveredItem', () => {
    let defaultState;
    const item1 = new paper.Path();
    const item2 = new paper.Path();
    expect(reducer(defaultState /* state */, setHoveredItem(item1) /* action */)).toBe(item1);
    expect(reducer(item1 /* state */, setHoveredItem(item2) /* action */)).toBe(item2);
});

test('clearHoveredItem', () => {
    let defaultState;
    const item = new paper.Path();
    expect(reducer(defaultState /* state */, clearHoveredItem() /* action */)).toBeNull();
    expect(reducer(item /* state */, clearHoveredItem() /* action */)).toBeNull();
});

test('invalidSetHoveredItem', () => {
    let defaultState;
    const item = new paper.Path();
    const nonItem = {random: 'object'};
    let undef;
    expect(reducer(defaultState /* state */, setHoveredItem(nonItem) /* action */)).toBeNull();
    expect(reducer(item /* state */, setHoveredItem(nonItem) /* action */))
        .toBe(item);
    expect(reducer(item /* state */, setHoveredItem(undef) /* action */))
        .toBe(item);
});
