/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeEach, describe, expect, it } from 'vitest'
import { registerScratchBlockPaster } from '../../src/scratch_block_paster'

// Browser test: duplicating a block with an obscured shadow must produce a
// copy with unique shadow IDs. Without the stripIds fix in
// ScratchBlockPaster.paste, the copy reuses the original's shadow IDs,
// causing the VM to think both blocks share the same shadow. Deleting one
// then destroys the other's shadow (forum topic 878291).

const BLOCK_TYPES = ['test_value_block', 'test_text_shadow', 'test_reporter']

let container: HTMLElement
let workspace: Blockly.WorkspaceSvg

beforeEach(() => {
  container = document.createElement('div')
  container.style.width = '800px'
  container.style.height = '600px'
  document.body.appendChild(container)
  workspace = Blockly.inject(container, {})
  registerScratchBlockPaster()

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'test_value_block',
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
})

afterEach(() => {
  workspace.dispose()
  container.remove()
  for (const t of BLOCK_TYPES) {
    delete Blockly.Blocks[t]
  }
})

describe('duplicate block shadow IDs (forum topic 878291)', () => {
  it('duplicated block gets unique shadow IDs, not shared with original', () => {
    // Create the original block with a shadow on VALUE
    Blockly.Events.disable()
    const original = Blockly.serialization.blocks.append(
      {
        type: 'test_value_block',
        inputs: {
          VALUE: {
            shadow: {
              type: 'test_text_shadow',
              fields: { TEXT: '0' },
            },
          },
        },
      },
      workspace,
    ) as Blockly.BlockSvg

    // Connect a reporter to obscure the shadow
    const reporter = workspace.newBlock('test_reporter')
    Blockly.Events.enable()

    const conn = original.getInput('VALUE')?.connection
    assert(conn, 'Expected VALUE connection')
    const reporterOutput = reporter.outputConnection
    assert(reporterOutput, 'Expected reporter output connection')
    conn.connect(reporterOutput)

    // Capture the original's shadow state before duplication
    const originalShadowState = conn.getShadowState()
    assert(originalShadowState, 'Expected shadow state on original after connecting reporter')
    const originalShadowId = originalShadowState.id
    assert(originalShadowId, 'Expected shadow state to have an ID')

    // Duplicate via the actual clipboard path (toCopyData + paste)
    const copyData = original.toCopyData()
    assert(copyData, 'Expected toCopyData to return data')
    const copyResult = Blockly.clipboard.paste(copyData, workspace)
    assert(copyResult, 'Expected paste to return a block')
    const copy = copyResult as unknown as Blockly.BlockSvg

    // The copy's shadow should have a DIFFERENT ID than the original's
    const copyConn = copy.getInput('VALUE')?.connection
    assert(copyConn, 'Expected VALUE connection on copy')
    const copyShadowState = copyConn.getShadowState()
    assert(copyShadowState, 'Expected shadow state on copy')

    expect(copyShadowState.id).not.toBe(originalShadowId)

    // Verify: deleting the copy does not affect the original's shadow
    copy.dispose()
    reporterOutput.disconnect()
    const respawned = conn.targetBlock()
    assert(respawned, 'Original shadow should respawn after copy is deleted')
    expect(respawned.isShadow()).toBe(true)
    expect(respawned.type).toBe('test_text_shadow')
  })
})
