/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach } from 'vitest'

/**
 * Creates a headless Blockly.Workspace and registers cleanup to run after
 * each test.
 * @returns A new headless workspace that disposes itself after each test.
 */
export function createHeadlessWorkspace(): Blockly.Workspace {
  const workspace = new Blockly.Workspace()
  afterEach(() => {
    workspace.dispose()
  })
  return workspace
}

/**
 * Defines a minimal block type for use in tests that need blocks with
 * variable fields. Call undefineGetVarBlock() in afterEach/teardown.
 */
export function defineGetVarBlock(): void {
  Blockly.defineBlocksWithJsonArray([
    {
      type: 'get_var_block',
      message0: '%1',
      args0: [
        {
          type: 'field_variable',
          name: 'VAR',
          variableTypes: ['', 'type1', 'type2'],
        },
      ],
    },
  ])
}

export function undefineGetVarBlock(): void {
  delete Blockly.Blocks.get_var_block
}

/**
 * Verifies that a variable with the given name, type, and id exists in the
 * given VariableMap (or workspace, which has the same getVariableById method).
 * @param container The VariableMap (or workspace) to check.
 * @param name Expected variable name.
 * @param type Expected variable type.
 * @param id Expected variable id.
 */
export function checkVariableValues(
  container: Blockly.VariableMap,
  name: string,
  type: string,
  id: string,
): void {
  const variable = container.getVariableById(id)
  if (!variable) throw new Error(`Expected variable with id '${id}' to exist`)
  if (variable.getName() !== name)
    throw new Error(`Expected variable name '${name}', got '${variable.getName()}'`)
  if (variable.type !== type) throw new Error(`Expected variable type '${type}', got '${variable.type}'`)
  if (variable.getId() !== id) throw new Error(`Expected variable id '${id}', got '${variable.getId()}'`)
}

/**
 * Create a mock block referencing the given variable id. Requires that
 * defineGetVarBlock() has been called.
 * @param workspace The workspace to create the block in.
 * @param variableId The id of the variable to reference.
 * @returns The created block.
 */
export function createMockBlock(workspace: Blockly.Workspace, variableId: string): Blockly.Block {
  if (!Blockly.Blocks.get_var_block) {
    throw new Error('Call defineGetVarBlock() before createMockBlock()')
  }
  Blockly.Events.disable()
  try {
    const block = workspace.newBlock('get_var_block')
    block.inputList[0].fieldRow[0].setValue(variableId)
    return block
  } finally {
    Blockly.Events.enable()
  }
}

/**
 * Parses an XML string and returns the DOM element.
 * @param xml The XML string to parse.
 * @returns The parsed DOM element.
 */
export function textToDom(xml: string): Element {
  return Blockly.utils.xml.textToDom(xml)
}
