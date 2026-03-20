/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { registerFieldVariableGetter } from '../../src/fields/field_variable_getter'

// Tests for FieldVariableGetter — a scratch-blocks-specific field that
// displays a variable name as a label but returns the variable's ID as its
// value (unlike Blockly's FieldVariable which stores the name).

let workspace: Blockly.Workspace

beforeAll(() => {
  registerFieldVariableGetter()
})

beforeEach(() => {
  workspace = new Blockly.Workspace()
  Blockly.defineBlocksWithJsonArray([
    {
      type: 'variable_getter_test_block',
      message0: '%1',
      args0: [{ type: 'field_variable_getter', name: 'VAR' }],
    },
  ])
})

afterEach(() => {
  workspace.dispose()
  delete Blockly.Blocks.variable_getter_test_block
})

/**
 * Creates a block with the VAR field pre-set to the given variable via XML.
 * @param varName The human-readable name (e.g. `'myVar'`).
 * @param varId The unique identifier (e.g. `'my-id-1'`).
 * @returns The created block and its VAR field.
 */
function createBlockWithVariable(varName: string, varId: string): { block: Blockly.Block; field: Blockly.Field } {
  workspace.getVariableMap().createVariable(varName, '', varId)
  const xml = Blockly.utils.xml.textToDom(`
    <xml>
      <block type="variable_getter_test_block">
        <field name="VAR" id="${varId}">${varName}</field>
      </block>
    </xml>
  `)
  Blockly.Xml.domToWorkspace(xml, workspace)
  const block = workspace.getAllBlocks(false)[0]
  const field = block.getField('VAR')
  assert(field, 'Expected VAR field on block')
  return { block, field }
}

describe('FieldVariableGetter', () => {
  it('getValue returns the variable ID', () => {
    const { field } = createBlockWithVariable('myVar', 'my-id-1')
    expect(field.getValue()).toBe('my-id-1')
  })

  it('getText returns the variable name', () => {
    const { field } = createBlockWithVariable('myVar', 'my-id-2')
    expect(field.getText()).toBe('myVar')
  })

  it('getText reflects an updated variable name after rename', () => {
    const { field } = createBlockWithVariable('oldName', 'my-id-3')
    const variable = workspace.getVariableMap().getVariableById('my-id-3')
    assert(variable, 'Expected variable my-id-3')
    workspace.getVariableMap().renameVariable(variable, 'newName')
    expect(field.getText()).toBe('newName')
  })
})
