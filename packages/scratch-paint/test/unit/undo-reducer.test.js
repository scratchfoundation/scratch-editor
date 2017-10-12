/* eslint-env jest */
import undoReducer from '../../src/reducers/undo';
import {undoSnapshot, undo, redo, clearUndoState} from '../../src/reducers/undo';

test('initialState', () => {
    let defaultState;

    expect(undoReducer(defaultState /* state */, {type: 'anything'} /* action */)).toBeDefined();
    expect(undoReducer(defaultState /* state */, {type: 'anything'} /* action */).pointer).toEqual(-1);
    expect(undoReducer(defaultState /* state */, {type: 'anything'} /* action */).stack).toHaveLength(0);
});

test('snapshot', () => {
    let defaultState;
    const state1 = {state: 1};
    const state2 = {state: 2};

    let reduxState = undoReducer(defaultState /* state */, undoSnapshot([state1]) /* action */);
    expect(reduxState.pointer).toEqual(0);
    expect(reduxState.stack).toHaveLength(1);
    expect(reduxState.stack[0]).toEqual(state1);

    reduxState = undoReducer(reduxState /* state */, undoSnapshot([state2]) /* action */);
    expect(reduxState.pointer).toEqual(1);
    expect(reduxState.stack).toHaveLength(2);
    expect(reduxState.stack[0]).toEqual(state1);
    expect(reduxState.stack[1]).toEqual(state2);
});

test('invalidSnapshot', () => {
    let defaultState;
    const state1 = {state: 1};

    const reduxState = undoReducer(defaultState /* state */, undoSnapshot([state1]) /* action */);
    const newReduxState = undoReducer(reduxState /* state */, undoSnapshot() /* action */); // No snapshot provided
    expect(reduxState).toEqual(newReduxState);
});

test('clearUndoState', () => {
    let defaultState;
    const state1 = {state: 1};
    const state2 = {state: 2};

    // Push 2 states then clear
    const reduxState = undoReducer(defaultState /* state */, undoSnapshot([state1]) /* action */);
    undoReducer(reduxState /* state */, undoSnapshot([state2]) /* action */);
    const newReduxState = undoReducer(reduxState /* state */, clearUndoState() /* action */);

    expect(newReduxState.pointer).toEqual(-1);
    expect(newReduxState.stack).toHaveLength(0);
});

test('cantUndo', () => {
    let defaultState;
    const state1 = {state: 1};

    // Undo when there's no undo stack
    let reduxState = undoReducer(defaultState /* state */, undo() /* action */);

    expect(reduxState.pointer).toEqual(-1);
    expect(reduxState.stack).toHaveLength(0);

    // Undo when there's only one state
    reduxState = undoReducer(reduxState /* state */, undoSnapshot([state1]) /* action */);
    reduxState = undoReducer(reduxState /* state */, undo() /* action */);

    expect(reduxState.pointer).toEqual(0);
    expect(reduxState.stack).toHaveLength(1);
});

test('cantRedo', () => {
    let defaultState;
    const state1 = {state: 1};

    let reduxState = undoReducer(defaultState /* state */, undoSnapshot([state1]) /* action */);

    // Redo when there's no redo stack
    reduxState = undoReducer(reduxState /* state */, redo() /* action */);

    expect(reduxState.pointer).toEqual(0);
    expect(reduxState.stack).toHaveLength(1);
});

test('undo', () => {
    let defaultState;
    const state1 = {state: 1};
    const state2 = {state: 2};

    // Push 2 states then undo one
    let reduxState = undoReducer(defaultState /* state */, undoSnapshot([state1]) /* action */);
    reduxState = undoReducer(reduxState /* state */, undoSnapshot([state2]) /* action */);
    reduxState = undoReducer(reduxState /* state */, undo() /* action */);

    expect(reduxState.pointer).toEqual(0);
    expect(reduxState.stack).toHaveLength(2);
    expect(reduxState.stack[0]).toEqual(state1);
    expect(reduxState.stack[1]).toEqual(state2);
});

test('redo', () => {
    let defaultState;
    const state1 = {state: 1};
    const state2 = {state: 2};

    // Push 2 states then undo one
    let reduxState = undoReducer(defaultState /* state */, undoSnapshot([state1]) /* action */);
    reduxState = undoReducer(reduxState /* state */, undoSnapshot([state2]) /* action */);
    let newReduxState = undoReducer(reduxState /* state */, undo() /* action */);

    // Now redo and check equality with previous state
    newReduxState = undoReducer(newReduxState /* state */, redo() /* action */);
    expect(newReduxState.pointer).toEqual(reduxState.pointer);
    expect(newReduxState.stack).toHaveLength(reduxState.stack.length);
    expect(newReduxState.stack[0]).toEqual(reduxState.stack[0]);
    expect(reduxState.stack[1]).toEqual(reduxState.stack[1]);
});

test('undoSnapshotCantRedo', () => {
    let defaultState;
    const state1 = {state: 1};
    const state2 = {state: 2};
    const state3 = {state: 3};

    // Push 2 states then undo
    let reduxState = undoReducer(defaultState /* state */, undoSnapshot([state1]) /* action */);
    reduxState = undoReducer(reduxState /* state */, undoSnapshot([state2]) /* action */);
    reduxState = undoReducer(reduxState /* state */, undo() /* action */);

    expect(reduxState.pointer).toEqual(0);
    expect(reduxState.stack).toHaveLength(2);

    // Snapshot
    reduxState = undoReducer(reduxState /* state */, undoSnapshot([state3]) /* action */);
    // Redo should do nothing
    const newReduxState = undoReducer(reduxState /* state */, redo() /* action */);

    expect(newReduxState.pointer).toEqual(reduxState.pointer);
    expect(newReduxState.stack).toHaveLength(reduxState.stack.length);
    expect(newReduxState.stack[0]).toEqual(reduxState.stack[0]);
    expect(newReduxState.stack[1]).toEqual(state3);
});
