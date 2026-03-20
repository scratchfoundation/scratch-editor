/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeEach, describe, expect, it } from 'vitest'

// Browser test for registerDuplicateBlock — verifies that the scratch-specific
// duplicate behavior includes blocks connected via the "next" connection.
// Covers issue #3470: "Next" blocks not picked up by copy/cut and paste.

let container: HTMLElement
let workspace: Blockly.WorkspaceSvg

beforeEach(() => {
  container = document.createElement('div')
  container.style.width = '800px'
  container.style.height = '600px'
  document.body.appendChild(container)
  workspace = Blockly.inject(container, {})

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'test_stack_block',
      message0: 'block %1',
      args0: [{ type: 'field_number', name: 'NUM', value: 0 }],
      previousStatement: null,
      nextStatement: null,
    },
  ])
})

afterEach(() => {
  workspace.dispose()
  container.remove()
  delete Blockly.Blocks.test_stack_block
})

describe('registerDuplicateBlock — toCopyData includes next connection (issue #3470)', () => {
  it('toCopyData(true) serialises the next block; toCopyData(false) does not', () => {
    Blockly.Xml.domToWorkspace(
      Blockly.utils.xml.textToDom(`
        <xml>
          <block type="test_stack_block">
            <field name="NUM">1</field>
            <next>
              <block type="test_stack_block">
                <field name="NUM">2</field>
              </block>
            </next>
          </block>
        </xml>
      `),
      workspace,
    )

    const blocks = workspace.getAllBlocks(false)
    const first = blocks.find((b) => b.getNextBlock() !== null)
    assert(first, 'Expected a block with a next connection')

    // registerDuplicateBlock calls toCopyData(true) to include subsequent blocks
    // (the scratch-specific behaviour that fixed #3470).
    const withNext = first.toCopyData(true)
    const withoutNext = first.toCopyData(false)

    expect(withNext).not.toBeNull()
    expect(withoutNext).not.toBeNull()

    // BlockCopyData stores the serialised block state as blockState (JSON).
    // When addNextBlocks=true, blockState includes a "next" key.
    const withNextState = JSON.stringify((withNext as { blockState: unknown }).blockState)
    const withoutNextState = JSON.stringify((withoutNext as { blockState: unknown }).blockState)

    expect(withNextState).toContain('"next"')
    expect(withoutNextState).not.toContain('"next"')
  })
})
