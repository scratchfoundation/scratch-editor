/* eslint-env jest */
import undoReducer, {
    undoSnapshot, undo, redo, clearUndoState, MAX_STACK_SIZE
} from '../../src/reducers/undo';

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

test('snapshotAtMaxStackSize', () => {
    let defaultState;
    const getState = function (num) {
        return {state: num};
    };
    // Push MAX_STACK_SIZE states
    let num = 1;
    let reduxState = undoReducer(defaultState /* state */, undoSnapshot([getState(num)]) /* action */);
    for (num = 2; num <= MAX_STACK_SIZE; num++) {
        reduxState = undoReducer(reduxState /* state */, undoSnapshot([getState(num)]) /* action */);
    }

    expect(reduxState.pointer).toEqual(MAX_STACK_SIZE - 1);
    expect(reduxState.stack).toHaveLength(MAX_STACK_SIZE);
    expect(reduxState.stack[0].state).toEqual(1);

    // Push one more
    reduxState = undoReducer(reduxState /* state */, undoSnapshot([getState(num)]) /* action */);

    // Stack size stays the same
    expect(reduxState.pointer).toEqual(MAX_STACK_SIZE - 1);
    expect(reduxState.stack).toHaveLength(MAX_STACK_SIZE);
    expect(reduxState.stack[0].state).toEqual(2); // State 1 was cut off
    expect(reduxState.stack[MAX_STACK_SIZE - 1].state).toEqual(MAX_STACK_SIZE + 1); // Newest added state is at end
});

test('undoRedoAtMaxStackSize', () => {
    let defaultState;
    const getState = function (num) {
        return {state: num};
    };
    // Push MAX_STACK_SIZE states
    let num = 1;
    let reduxState = undoReducer(defaultState /* state */, undoSnapshot([getState(num)]) /* action */);
    for (num = 2; num <= MAX_STACK_SIZE; num++) {
        reduxState = undoReducer(reduxState /* state */, undoSnapshot([getState(num)]) /* action */);
    }

    // Undo twice and redo
    reduxState = undoReducer(reduxState /* state */, undo() /* action */);
    reduxState = undoReducer(reduxState /* state */, undo() /* action */);
    reduxState = undoReducer(reduxState /* state */, redo() /* action */);

    expect(reduxState.pointer).toEqual(MAX_STACK_SIZE - 2);
    expect(reduxState.stack).toHaveLength(MAX_STACK_SIZE);
    expect(reduxState.stack[0].state).toEqual(1);
});

test('undoSnapshotAtMaxStackSize', () => {
    let defaultState;
    const getState = function (num) {
        return {state: num};
    };
    // Push MAX_STACK_SIZE states
    let num = 1;
    let reduxState = undoReducer(defaultState /* state */, undoSnapshot([getState(num)]) /* action */);
    for (num = 2; num <= MAX_STACK_SIZE; num++) {
        reduxState = undoReducer(reduxState /* state */, undoSnapshot([getState(num)]) /* action */);
    }

    // Undo twice and then take a snapshot
    reduxState = undoReducer(reduxState /* state */, undo() /* action */);
    reduxState = undoReducer(reduxState /* state */, undo() /* action */);
    reduxState = undoReducer(reduxState /* state */, undoSnapshot([getState(num)]) /* action */);

    expect(reduxState.pointer).toEqual(MAX_STACK_SIZE - 2);
    expect(reduxState.stack).toHaveLength(MAX_STACK_SIZE - 1);
    expect(reduxState.stack[0].state).toEqual(1);
    expect(reduxState.stack[MAX_STACK_SIZE - 2].state).toEqual(MAX_STACK_SIZE + 1); // Newest added state is at end
    expect(reduxState.stack[MAX_STACK_SIZE - 3].state).toEqual(MAX_STACK_SIZE - 2); // Old redo state is gone
});
