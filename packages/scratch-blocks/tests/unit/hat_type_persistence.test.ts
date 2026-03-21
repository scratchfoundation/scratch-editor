/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '../../src/blocks/vertical_extensions'

// Regression test for issue #3457: hat block shape lost after setStyle().
// When Blockly refreshes workspace themes it calls setStyle() on all blocks,
// which reset block.hat to '' (the default for most styles). The fix overrides
// setStyle() on hat-block instances to re-apply the hat type afterward.

let workspace: Blockly.Workspace

beforeEach(() => {
  workspace = new Blockly.Workspace()
})

afterEach(() => {
  workspace.dispose()
  delete Blockly.Blocks.test_hat_block
  delete Blockly.Blocks.test_bowler_hat_block
})

describe('hat type persistence after setStyle — issue #3457', () => {
  it('shape_hat block retains hat="cap" after setStyle is called', () => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'test_hat_block',
        message0: 'hat',
        extensions: ['shape_hat'],
        style: 'motion_blocks',
      },
    ])

    const block = workspace.newBlock('test_hat_block')
    expect(block.hat).toBe('cap')

    // Simulate Blockly refreshing the theme — calls setStyle on all blocks.
    block.setStyle('motion_blocks')

    // Before the fix, hat would be reset to '' here.
    expect(block.hat).toBe('cap')
  })

  it('shape_bowler_hat block retains hat="bowler" after setStyle is called', () => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'test_bowler_hat_block',
        message0: 'bowler',
        extensions: ['shape_bowler_hat'],
        style: 'looks_blocks',
      },
    ])

    const block = workspace.newBlock('test_bowler_hat_block')
    expect(block.hat).toBe('bowler')

    block.setStyle('looks_blocks')

    expect(block.hat).toBe('bowler')
  })

  it('hat type persists across multiple setStyle calls', () => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'test_hat_block',
        message0: 'hat',
        extensions: ['shape_hat'],
        style: 'motion_blocks',
      },
    ])

    const block = workspace.newBlock('test_hat_block')
    block.setStyle('motion_blocks')
    block.setStyle('looks_blocks')
    block.setStyle('motion_blocks')

    expect(block.hat).toBe('cap')
  })
})
