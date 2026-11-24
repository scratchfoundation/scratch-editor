/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeEach, describe, expect, it } from 'vitest'
import { compareStrings, stripIds } from '../../src/scratch_blocks_utils'

describe('compareStrings', () => {
  describe('numeric sorting', () => {
    it('sorts "name2" before "name10" (natural number order)', () => {
      expect(compareStrings('name2', 'name10')).toBeLessThan(0)
    })

    it('sorts "name10" after "name2"', () => {
      expect(compareStrings('name10', 'name2')).toBeGreaterThan(0)
    })

    it('treats equal strings as equal', () => {
      expect(compareStrings('name1', 'name1')).toBe(0)
    })

    it('sorts bare numbers naturally', () => {
      expect(compareStrings('9', '10')).toBeLessThan(0)
    })
  })

  describe('case insensitivity', () => {
    it('treats uppercase and lowercase as equal', () => {
      expect(compareStrings('ABC', 'abc')).toBe(0)
    })

    it('treats mixed case as equal', () => {
      expect(compareStrings('Foo', 'foo')).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles empty strings as equal', () => {
      expect(compareStrings('', '')).toBe(0)
    })

    it('sorts empty string before non-empty', () => {
      expect(compareStrings('', 'a')).toBeLessThan(0)
    })

    it('handles strings with only digits', () => {
      expect(compareStrings('2', '10')).toBeLessThan(0)
    })

    it('handles strings with special characters', () => {
      // Just ensure it does not throw
      expect(() => compareStrings('a-b', 'a_b')).not.toThrow()
    })
  })
})

describe('stripIds', () => {
  it('removes id from the top-level block', () => {
    const state = { type: 'motion_movesteps', id: 'abc' }
    const result = stripIds(state)
    expect(result.id).toBeUndefined()
    expect(result.type).toBe('motion_movesteps')
  })

  it('does not mutate the input state', () => {
    const state = { type: 'motion_movesteps', id: 'abc' }
    stripIds(state)
    expect(state.id).toBe('abc')
  })

  it('removes ids from shadow blocks in inputs without mutating originals', () => {
    const shadow = { type: 'math_number', id: 'shadow_1', fields: { NUM: 0 } }
    const state = {
      type: 'motion_setx',
      id: 'block_1',
      inputs: { X: { shadow } },
    }

    const result = stripIds(state)

    expect(result.id).toBeUndefined()
    expect(result.inputs?.X.shadow?.id).toBeUndefined()
    expect(result.inputs?.X.shadow?.type).toBe('math_number')
    // Original must be untouched
    expect(shadow.id).toBe('shadow_1')
    expect(state.id).toBe('block_1')
  })

  it('removes ids from block children in inputs', () => {
    const child = { type: 'motion_xposition', id: 'child_1' }
    const shadow = { type: 'math_number', id: 'shadow_1' }
    const state = {
      type: 'motion_setx',
      id: 'block_1',
      inputs: { X: { shadow, block: child } },
    }

    const result = stripIds(state)

    expect(result.inputs?.X.shadow?.id).toBeUndefined()
    expect(result.inputs?.X.block?.id).toBeUndefined()
    // Originals untouched
    expect(shadow.id).toBe('shadow_1')
    expect(child.id).toBe('child_1')
  })

  it('removes ids from next connections without mutating originals', () => {
    const nextBlock = { type: 'motion_movesteps', id: 'next_1' }
    const state = {
      type: 'motion_movesteps',
      id: 'block_1',
      next: { block: nextBlock },
    }

    const result = stripIds(state)

    expect(result.next?.block?.id).toBeUndefined()
    expect(nextBlock.id).toBe('next_1')
  })

  it('handles deeply nested inputs', () => {
    const innerShadow = { type: 'math_number', id: 'inner_shadow' }
    const innerBlock = {
      type: 'operator_add',
      id: 'inner',
      inputs: { NUM1: { shadow: innerShadow } },
    }
    const state = {
      type: 'motion_setx',
      id: 'outer',
      inputs: { X: { block: innerBlock } },
    }

    const result = stripIds(state)

    expect(result.inputs?.X.block?.inputs?.NUM1.shadow?.id).toBeUndefined()
    expect(innerShadow.id).toBe('inner_shadow')
  })
})

describe('stripIds with live Blockly workspace', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'test_value_input',
        message0: 'value %1',
        args0: [{ type: 'input_value', name: 'X' }],
        previousStatement: null,
        nextStatement: null,
      },
      {
        type: 'test_reporter',
        message0: 'reporter',
        output: null,
      },
      {
        type: 'test_shadow',
        message0: '%1',
        args0: [{ type: 'field_number', name: 'NUM', value: 0 }],
        output: null,
      },
    ])
    workspace = new Blockly.Workspace()
  })

  afterEach(() => {
    workspace.dispose()
    for (const type of ['test_value_input', 'test_reporter', 'test_shadow']) {
      delete Blockly.Blocks[type]
    }
  })

  it('does not corrupt the original block shadow state when stripping a serialized copy', () => {
    // Simulate the duplication bug: create a block with a shadow input,
    // cover the shadow with a reporter, serialize with saveIds:false
    // (same as toCopyData), then call stripIds on the result.
    // The original block's connection.shadowState must be untouched.

    // Create a block with a shadow in its input
    const parent = workspace.newBlock('test_value_input')
    const input = parent.getInput('X')
    assert(input?.connection, 'test_value_input should have an X input with a connection')
    const inputConn = input.connection
    inputConn.setShadowState({ type: 'test_shadow', id: 'original_shadow_id' })

    // Cover the shadow with a non-shadow reporter
    const reporter = workspace.newBlock('test_reporter')
    assert(reporter.outputConnection, 'test_reporter should have an output connection')
    inputConn.connect(reporter.outputConnection)

    // The shadow is now covered; getShadowState() returns the stored state
    const shadowStateBefore = inputConn.getShadowState()
    assert(shadowStateBefore, 'shadow state should exist while covered')
    expect(shadowStateBefore.id).toBe('original_shadow_id')

    // Serialize the parent (same path as toCopyData with saveIds:false).
    // saveConnection returns shadowState by reference for covered shadows.
    const serialized = Blockly.serialization.blocks.save(parent, { saveIds: false })
    assert(serialized, 'serialization should succeed')

    // The serialized shadow should carry the original id (it's a shared reference)
    assert(serialized.inputs, 'serialized state should have inputs')
    const serializedConn = serialized.inputs.X
    assert(serializedConn, 'serialized state should have X connection')
    assert(serializedConn.shadow, 'serialized X connection should include the shadow')
    expect(serializedConn.shadow.id).toBe('original_shadow_id')

    // This is what ScratchBlockPaster.paste does before deserializing the copy
    const stripped = stripIds(serialized)

    // The stripped copy should have the shadow id removed
    assert(stripped.inputs, 'stripped state should have inputs')
    const strippedConn = stripped.inputs.X
    assert(strippedConn, 'stripped state should have X connection')
    assert(strippedConn.shadow, 'stripped X connection should include the shadow')
    expect(strippedConn.shadow.id).toBeUndefined()

    // The original block's shadow state must still have its id
    const shadowStateAfter = inputConn.getShadowState()
    assert(shadowStateAfter, 'shadow state should still exist')
    expect(shadowStateAfter.id).toBe('original_shadow_id')
  })
})
