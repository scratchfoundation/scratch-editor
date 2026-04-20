/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeEach, describe, expect, it, vi } from 'vitest'
// Import the blockToDom fix
import '../../src/xml'

/**
 * Regression tests for block input serialization (bug 878291).
 *
 * Block inputs (especially shadow-only inputs like VALUE on
 * data_setvariableto) must survive the full round-trip:
 *   toolbox XML -> flyout block -> JSON serialize -> workspace block
 *   -> BlockCreate event XML -> adapter XML parse
 *
 * The bug: inputs with only a shadow block were silently dropped
 * during one of these serialization steps, resulting in blocks
 * with `inputs: {}` in the saved project.
 */

const BLOCK_TYPES = ['test_set_variable', 'test_text_shadow', 'test_reporter']

/**
 * Returns a block's named input, asserting that it exists.
 * @param block The block to get the input from.
 * @param name The input name to look up on the block.
 * @returns The named input.
 */
function getInput(block: Blockly.Block, name: string): Blockly.Input {
  const input = block.getInput(name)
  assert(input, `Expected input "${name}" on ${block.type}`)
  return input
}

/**
 * Returns an input's connection, asserting that it exists.
 * @param input The input to get the connection from.
 * @returns The input's connection.
 */
function getConnection(input: Blockly.Input): Blockly.Connection {
  assert(input.connection, `Expected connection on input "${input.name}"`)
  return input.connection
}

let workspace: Blockly.Workspace

beforeEach(() => {
  Blockly.defineBlocksWithJsonArray([
    {
      type: 'test_set_variable',
      message0: 'set to %1',
      args0: [{ type: 'input_value', name: 'VALUE' }],
      previousStatement: null,
      nextStatement: null,
    },
    {
      type: 'test_text_shadow',
      message0: '%1',
      args0: [{ type: 'field_input', name: 'TEXT' }],
      output: 'String',
    },
    {
      type: 'test_reporter',
      message0: 'answer',
      output: 'String',
    },
  ])
  workspace = new Blockly.Workspace()
})

afterEach(() => {
  workspace.dispose()
  for (const t of BLOCK_TYPES) {
    delete Blockly.Blocks[t]
  }
})

/** Shadow state shared across tests. */
const SHADOW_INPUT_STATE: Blockly.serialization.blocks.State = {
  type: 'test_set_variable',
  inputs: {
    VALUE: {
      shadow: {
        type: 'test_text_shadow',
        fields: { TEXT: '0' },
      },
    },
  },
}

/**
 * Creates a test block from JSON with events disabled.
 * @param state The JSON state to create the block from.
 * @returns The created block.
 */
function createTestBlock(state: Blockly.serialization.blocks.State): Blockly.Block {
  Blockly.Events.disable()
  try {
    return Blockly.serialization.blocks.append(state, workspace)
  } finally {
    Blockly.Events.enable()
  }
}

describe('block input serialization round-trip', () => {
  it('newBlock creates VALUE input on the block', () => {
    const block = workspace.newBlock('test_set_variable')
    const input = getInput(block, 'VALUE')
    expect(getConnection(input)).toBeDefined()
    block.dispose()
  })

  it('JSON save() includes shadow-only VALUE input', () => {
    const block = createTestBlock(SHADOW_INPUT_STATE)

    const conn = getConnection(getInput(block, 'VALUE'))
    const target = conn.targetBlock()
    assert(target, 'Expected a shadow block on VALUE')
    expect(target.isShadow()).toBe(true)

    const saved = Blockly.serialization.blocks.save(block)
    assert(saved, 'Expected save to return a state object')
    expect(saved.inputs).toBeDefined()
    assert(saved.inputs?.VALUE, 'Expected VALUE in saved inputs')
    expect(saved.inputs.VALUE.shadow).toBeDefined()
    expect(saved.inputs.VALUE.shadow?.type).toBe('test_text_shadow')

    block.dispose()
  })

  it('blockToDom includes VALUE shadow in XML output', () => {
    const block = createTestBlock(SHADOW_INPUT_STATE)

    const dom = Blockly.Xml.blockToDom(block)
    expect(dom).toBeInstanceOf(Element)

    const xmlStr = new XMLSerializer().serializeToString(dom)
    expect(xmlStr).toContain('name="VALUE"')
    expect(xmlStr).toContain('<shadow')
    expect(xmlStr).toContain('type="test_text_shadow"')

    block.dispose()
  })

  it('flyout copy path: JSON save -> delete id -> append preserves shadow', () => {
    const flyoutBlock = createTestBlock({
      ...SHADOW_INPUT_STATE,
      id: 'flyout-template',
    })

    const json = Blockly.serialization.blocks.save(flyoutBlock)
    assert(json, 'Expected save to return state')
    delete json.id // CheckableContinuousFlyout deletes the root id

    const newBlock = Blockly.serialization.blocks.append(json, workspace, {
      recordUndo: true,
    })

    const conn = getConnection(getInput(newBlock, 'VALUE'))
    const target = conn.targetBlock()
    assert(target, 'Expected shadow on copied block')
    expect(target.isShadow()).toBe(true)
    expect(conn.getShadowDom()).not.toBeNull()
    expect(conn.getShadowState()).not.toBeNull()

    const dom = Blockly.Xml.blockToDom(newBlock)
    const xmlStr = new XMLSerializer().serializeToString(dom)
    expect(xmlStr).toContain('name="VALUE"')
    expect(xmlStr).toContain('<shadow')

    // Note: in a headless test environment, Blockly's async event dispatch
    // (requestAnimationFrame + setTimeout) doesn't fire. The workspace state
    // and blockToDom output above verify correctness at the Blockly level.

    flyoutBlock.dispose()
    newBlock.dispose()
  })

  it('blockToDom recovers shadow when targetBlock() is null (Blockly empty flag bug)', () => {
    // This tests the specific Blockly bug that causes cursed inputs:
    // blockToDom has an `empty` flag that is only set to false when a
    // targetBlock exists. If a connection has shadowDom but no targetBlock,
    // the shadow IS appended to the <value> container, but `empty` stays
    // true and the container is not appended to the output.
    //
    // The scratch-blocks wrapper around blockToDom detects and recovers
    // this case.
    const block = createTestBlock(SHADOW_INPUT_STATE)

    const conn = getConnection(getInput(block, 'VALUE'))
    expect(conn.targetBlock()).not.toBeNull()
    expect(conn.getShadowDom()).not.toBeNull()

    // Dispose the shadow block to create the pathological state:
    // shadowDom set but no targetBlock. After disposing a shadow,
    // respawnShadow_ is NOT called (because the disconnected block IS
    // a shadow), so targetBlock() becomes null while shadow state persists.
    const shadow = conn.targetBlock()
    assert(shadow, 'Expected shadow block')
    Blockly.Events.disable()
    try {
      shadow.dispose(false)
    } finally {
      Blockly.Events.enable()
    }

    // Verify the pathological state exists
    const currentTarget = conn.targetBlock()
    const currentShadowDom = conn.getShadowDom()
    expect(currentTarget).toBeNull()
    expect(currentShadowDom).not.toBeNull()

    // Without the fix, blockToDom would produce XML without the VALUE input.
    // With the fix, the shadow is recovered (and a warning is logged).
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dom = Blockly.Xml.blockToDom(block)
    const xmlStr = new XMLSerializer().serializeToString(dom)
    expect(xmlStr).toContain('name="VALUE"')
    expect(xmlStr).toContain('shadow')
    expect(warnSpy).toHaveBeenCalledOnce()
    warnSpy.mockRestore()

    block.dispose()
  })

  it('shadow respawns after connecting and disconnecting a reporter', () => {
    const block = createTestBlock(SHADOW_INPUT_STATE)

    Blockly.Events.disable()
    let reporter: Blockly.Block
    try {
      reporter = workspace.newBlock('test_reporter')
    } finally {
      Blockly.Events.enable()
    }

    const conn = getConnection(getInput(block, 'VALUE'))
    const reporterOutput = reporter.outputConnection
    assert(reporterOutput, 'Expected output connection on reporter')

    // Connect reporter (displaces shadow)
    conn.connect(reporterOutput)
    expect(conn.targetBlock()).toBe(reporter)
    expect(conn.getShadowDom()).not.toBeNull()

    // Disconnect reporter (shadow should respawn)
    reporterOutput.disconnect()
    const respawned = conn.targetBlock()
    assert(respawned, 'Expected shadow to respawn after disconnect')
    expect(respawned.isShadow()).toBe(true)
    expect(respawned.type).toBe('test_text_shadow')

    const dom = Blockly.Xml.blockToDom(block)
    const xmlStr = new XMLSerializer().serializeToString(dom)
    expect(xmlStr).toContain('name="VALUE"')
    expect(xmlStr).toContain('<shadow')

    reporter.dispose()
    block.dispose()
  })
})
