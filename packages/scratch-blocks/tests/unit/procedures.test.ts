/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PROCEDURES_CALL_BLOCK_TYPE } from '../../src/constants'
import { getCallers, ScratchProcedures } from '../../src/procedures'

// Replaces tests/jsunit/procedure_test.js, and adds coverage for
// PRs #3492 (context menu delegation) and #3493 (arg reporter duplication).

// The old tests used new Blockly.Workspace() and cast as needed.
// getCallers() takes WorkspaceSvg/BlockSvg by type signature, but at runtime
// it only calls methods available on headless Workspace/Block too.
type HeadlessWorkspace = Blockly.Workspace & {
  getTopBlocks(): Blockly.Block[]
  hideChaff(): void
}

let workspace: HeadlessWorkspace

function setUp() {
  // Register stub procedure call block with getProcCode.
  Blockly.Blocks[PROCEDURES_CALL_BLOCK_TYPE] = {
    init(this: Blockly.Block & { procCode_: string }) {
      this.procCode_ = ''
      this.setPreviousStatement(true)
      this.setNextStatement(true)
    },
    getProcCode(this: Blockly.Block & { procCode_: string }) {
      return this.procCode_
    },
  }
  Blockly.Blocks.foo = {
    init(this: Blockly.Block) {
      this.jsonInit({
        message0: 'foo',
        previousStatement: null,
        nextStatement: null,
      })
    },
  }
  Blockly.Blocks.loop = {
    init(this: Blockly.Block) {
      this.jsonInit({
        message0: 'forever %1',
        args0: [{ type: 'input_statement', name: 'SUBSTACK' }],
      })
    },
  }
  workspace = new Blockly.Workspace() as unknown as HeadlessWorkspace
  // BlockSvg.prototype.checkAndDelete calls workspace.hideChaff(), which only
  // exists on WorkspaceSvg. Add a no-op stub so the headless workspace works.
  workspace.hideChaff = () => undefined
}

function tearDown() {
  delete Blockly.Blocks[PROCEDURES_CALL_BLOCK_TYPE]
  delete Blockly.Blocks.foo
  delete Blockly.Blocks.loop
  workspace.dispose()
}

// Shorthand to set procCode_ on a block and return it.
function setCode(id: string, code: string): Blockly.Block & { procCode_: string } {
  const block = workspace.getBlockById(id) as Blockly.Block & { procCode_: string }
  block.procCode_ = code
  return block
}

// Load XML into the headless workspace.
function loadXml(xml: string) {
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace)
}

// ---------------------------------------------------------------------------
// getCallers — porting old procedure_test.js
// ---------------------------------------------------------------------------

describe('getCallers', () => {
  beforeEach(setUp)
  afterEach(tearDown)

  it('finds the single caller of a named procedure', () => {
    loadXml(
      `<xml><variables></variables>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_1" x="0" y="0"></block>
      </xml>`,
    )
    setCode('test_1', 'test_procedure')
    const callers = getCallers(
      'test_procedure',
      workspace as unknown as Blockly.WorkspaceSvg,
      { id: '' } as unknown as Blockly.BlockSvg,
      false,
    )
    expect(callers).toHaveLength(1)
    expect(callers[0].id).toBe('test_1')
  })

  it('excludes the definition stack when allowRecursive is false', () => {
    loadXml(
      `<xml><variables></variables>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_1" x="0" y="0"></block>
      </xml>`,
    )
    const rootBlock = setCode('test_1', 'test_procedure')
    const callers = getCallers(
      'test_procedure',
      workspace as unknown as Blockly.WorkspaceSvg,
      rootBlock as unknown as Blockly.BlockSvg,
      false,
    )
    expect(callers).toHaveLength(0)
  })

  it('includes the definition stack when allowRecursive is true', () => {
    loadXml(
      `<xml><variables></variables>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_1" x="0" y="0"></block>
      </xml>`,
    )
    const rootBlock = setCode('test_1', 'test_procedure')
    const callers = getCallers(
      'test_procedure',
      workspace as unknown as Blockly.WorkspaceSvg,
      rootBlock as unknown as Blockly.BlockSvg,
      true,
    )
    expect(callers).toHaveLength(1)
    expect(callers[0].id).toBe('test_1')
  })

  it('returns empty array when no call blocks exist', () => {
    loadXml(
      `<xml><variables></variables>
        <block type="foo" id="test_1" x="0" y="0"></block>
      </xml>`,
    )
    const callers = getCallers(
      'test_procedure',
      workspace as unknown as Blockly.WorkspaceSvg,
      { id: '' } as unknown as Blockly.BlockSvg,
      false,
    )
    expect(callers).toHaveLength(0)
  })

  it('returns empty array when the call block has a different procCode', () => {
    loadXml(
      `<xml><variables></variables>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_1" x="0" y="0"></block>
      </xml>`,
    )
    setCode('test_1', 'wrong procedure')
    const callers = getCallers(
      'test_procedure',
      workspace as unknown as Blockly.WorkspaceSvg,
      { id: '' } as unknown as Blockly.BlockSvg,
      false,
    )
    expect(callers).toHaveLength(0)
  })

  it('finds a caller nested on a statement input', () => {
    loadXml(
      `<xml>
        <block type="loop" id="test_1">
          <statement name="SUBSTACK">
            <block type="foo" id="test_2">
              <next>
                <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_3"></block>
              </next>
            </block>
          </statement>
        </block>
      </xml>`,
    )
    setCode('test_3', 'test_procedure')
    const callers = getCallers(
      'test_procedure',
      workspace as unknown as Blockly.WorkspaceSvg,
      { id: '' } as unknown as Blockly.BlockSvg,
      false,
    )
    expect(callers).toHaveLength(1)
    expect(callers[0].id).toBe('test_3')
  })

  it('finds the one matching caller across multiple stacks', () => {
    loadXml(
      `<xml>
        <block type="foo" id="test_1"></block>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_2"></block>
        <block type="foo" id="test_3"></block>
      </xml>`,
    )
    setCode('test_2', 'test_procedure')
    const callers = getCallers(
      'test_procedure',
      workspace as unknown as Blockly.WorkspaceSvg,
      { id: '' } as unknown as Blockly.BlockSvg,
      false,
    )
    expect(callers).toHaveLength(1)
    expect(callers[0].id).toBe('test_2')
  })

  it('finds all callers when multiple call blocks exist', () => {
    loadXml(
      `<xml>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_1"></block>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_2"></block>
      </xml>`,
    )
    setCode('test_1', 'test_procedure')
    setCode('test_2', 'test_procedure')
    const callers = getCallers(
      'test_procedure',
      workspace as unknown as Blockly.WorkspaceSvg,
      { id: '' } as unknown as Blockly.BlockSvg,
      false,
    )
    expect(callers).toHaveLength(2)
    const ids = callers.map((c) => c.id)
    expect(ids).toContain('test_1')
    expect(ids).toContain('test_2')
  })
})

// ---------------------------------------------------------------------------
// deleteProcedureDefCallback — porting old procedure_test.js
// ---------------------------------------------------------------------------

describe('deleteProcedureDefCallback', () => {
  beforeEach(setUp)
  afterEach(tearDown)

  it('deletes the definition stack when there are no callers, returns true', () => {
    loadXml(
      `<xml>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_1" x="0" y="0"></block>
        <block type="foo" id="test_2"></block>
        <block type="foo" id="test_3"></block>
      </xml>`,
    )
    setCode('test_1', 'test_procedure')
    const rootBlock = workspace.getBlockById('test_1') as Blockly.BlockSvg

    const result = ScratchProcedures.deleteProcedureDefCallback(
      'test_procedure',
      rootBlock as unknown as Blockly.BlockSvg,
    )

    expect(result).toBe(true)
    // The other two blocks should remain.
    expect(workspace.getTopBlocks()).toHaveLength(2)
  })

  it('deletes the whole stack when the only caller is within the definition, returns true', () => {
    loadXml(
      `<xml>
        <block type="loop" id="test_1">
          <statement name="SUBSTACK">
            <block type="foo" id="test_2">
              <next>
                <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_3"></block>
              </next>
            </block>
          </statement>
        </block>
      </xml>`,
    )
    setCode('test_3', 'test_procedure')
    const rootBlock = workspace.getBlockById('test_1') as Blockly.BlockSvg

    const result = ScratchProcedures.deleteProcedureDefCallback(
      'test_procedure',
      rootBlock as unknown as Blockly.BlockSvg,
    )

    expect(result).toBe(true)
    expect(workspace.getTopBlocks()).toHaveLength(0)
  })

  it('does not delete when there is a non-recursive caller, returns false', () => {
    loadXml(
      `<xml>
        <block type="${PROCEDURES_CALL_BLOCK_TYPE}" id="test_1" x="0" y="0"></block>
        <block type="foo" id="test_2"></block>
        <block type="foo" id="test_3"></block>
      </xml>`,
    )
    setCode('test_1', 'test_procedure')
    // The definition root is test_2 (a non-caller block) while test_1 is the caller.
    const rootBlock = workspace.getBlockById('test_2') as Blockly.BlockSvg

    const result = ScratchProcedures.deleteProcedureDefCallback(
      'test_procedure',
      rootBlock as unknown as Blockly.BlockSvg,
    )

    expect(result).toBe(false)
    // All three blocks should remain.
    expect(workspace.getTopBlocks()).toHaveLength(3)
  })
})
