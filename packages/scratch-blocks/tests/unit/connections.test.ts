/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeEach, describe, expect, it } from 'vitest'
import '../../src/scratch_c_block_wrap'
import '../../src/scratch_connection_checker'

type ScratchCheckerCtor = new () => {
  canConnectWithReason(a: Blockly.Connection, b: Blockly.Connection, isDragging: boolean): number
  doDragChecks(a: Blockly.Connection, b: Blockly.Connection, distance: number): boolean
}

// Replaces tests/jsunit/connection_test.js and connection_db_test.js,
// and adds ScratchConnectionChecker-specific tests (PR #3492/#3493).

let workspace: Blockly.Workspace

beforeEach(() => {
  workspace = new Blockly.Workspace()
})

afterEach(() => {
  workspace.dispose()
})

// ---------------------------------------------------------------------------
// ScratchConnectionChecker-specific tests
// ---------------------------------------------------------------------------

describe('ScratchConnectionChecker', () => {
  describe('canConnectWithReason — prototype next connection', () => {
    it('returns REASON_CHECKS_FAILED when a connection belongs to procedures_prototype NEXT', () => {
      // Register a minimal procedures_prototype block so we can create one.
      Blockly.defineBlocksWithJsonArray([
        {
          type: 'procedures_prototype',
          message0: 'prototype',
          nextStatement: null,
          previousStatement: null,
        },
        {
          type: 'test_statement_block',
          message0: 'statement',
          previousStatement: null,
          nextStatement: null,
        },
      ])

      try {
        const protoBlock = workspace.newBlock('procedures_prototype')
        const otherBlock = workspace.newBlock('test_statement_block')

        const protoConn = protoBlock.nextConnection
        const otherConn = otherBlock.previousConnection
        assert(protoConn, 'Expected procedures_prototype to have a next connection')
        assert(otherConn, 'Expected block to have a previous connection')

        // The default checker would not object, but ScratchConnectionChecker
        // should return REASON_CHECKS_FAILED.
        const ScratchChecker = Blockly.registry.getClass(
          Blockly.registry.Type.CONNECTION_CHECKER,
          Blockly.registry.DEFAULT,
        ) as ScratchCheckerCtor | null
        assert(ScratchChecker, 'Expected ScratchConnectionChecker to be registered')
        const result = new ScratchChecker().canConnectWithReason(protoConn, otherConn, false)
        expect(result).toBe(Blockly.Connection.REASON_CHECKS_FAILED)
      } finally {
        delete Blockly.Blocks.procedures_prototype
        delete Blockly.Blocks.test_statement_block
      }
    })
  })

  describe('doDragChecks — procedures_definition custom_block input', () => {
    it('prevents dragging a block into the custom_block slot of a definition', () => {
      Blockly.defineBlocksWithJsonArray([
        {
          type: 'procedures_definition',
          message0: '%1',
          args0: [{ type: 'input_value', name: 'custom_block' }],
        },
        {
          type: 'test_output_block',
          message0: 'output',
          output: null,
        },
      ])

      try {
        const defBlock = workspace.newBlock('procedures_definition')
        const otherBlock = workspace.newBlock('test_output_block')

        const defConn = defBlock.getInput('custom_block')?.connection
        const otherConn = otherBlock.outputConnection
        assert(defConn, 'Expected procedures_definition to have a custom_block connection')
        assert(otherConn, 'Expected block to have an output connection')

        const ScratchChecker = Blockly.registry.getClass(
          Blockly.registry.Type.CONNECTION_CHECKER,
          Blockly.registry.DEFAULT,
        ) as ScratchCheckerCtor | null
        assert(ScratchChecker, 'Expected ScratchConnectionChecker to be registered')
        const result = new ScratchChecker().doDragChecks(otherConn, defConn, 0)
        expect(result).toBe(false)
      } finally {
        delete Blockly.Blocks.procedures_definition
        delete Blockly.Blocks.test_output_block
      }
    })
  })

  describe('doDragChecks — C-block without nextConnection (e.g. forever)', () => {
    it('allows mid-stack insertion when the dragging block has a statement input for the orphan', () => {
      Blockly.defineBlocksWithJsonArray([
        {
          type: 'test_forever',
          message0: 'forever %1',
          args0: [{ type: 'input_statement', name: 'SUBSTACK' }],
          previousStatement: null,
          // no nextStatement
        },
        {
          type: 'test_stack',
          message0: 'stack',
          previousStatement: null,
          nextStatement: null,
        },
      ])

      try {
        const foreverBlock = workspace.newBlock('test_forever')
        const topBlock = workspace.newBlock('test_stack')
        const bottomBlock = workspace.newBlock('test_stack')

        assert(topBlock.nextConnection, 'topBlock should have nextConnection')
        assert(bottomBlock.previousConnection, 'bottomBlock should have previousConnection')
        topBlock.nextConnection.connect(bottomBlock.previousConnection)

        // Dragging forever's previousConnection toward topBlock's nextConnection
        // (which is occupied by bottomBlock). Base Blockly would reject this
        // because forever has no nextConnection, but ScratchConnectionChecker
        // should allow it because the orphan can go into the statement input.
        const ScratchChecker = Blockly.registry.getClass(
          Blockly.registry.Type.CONNECTION_CHECKER,
          Blockly.registry.DEFAULT,
        ) as ScratchCheckerCtor | null
        assert(ScratchChecker, 'Expected ScratchConnectionChecker to be registered')
        assert(foreverBlock.previousConnection, 'foreverBlock should have previousConnection')
        assert(topBlock.nextConnection, 'topBlock should have nextConnection')
        const result = new ScratchChecker().doDragChecks(
          foreverBlock.previousConnection,
          topBlock.nextConnection,
          Infinity,
        )
        expect(result).toBe(true)
      } finally {
        delete Blockly.Blocks.test_forever
        delete Blockly.Blocks.test_stack
      }
    })

    it('rejects mid-stack insertion when the target block is an insertion marker', () => {
      Blockly.defineBlocksWithJsonArray([
        {
          type: 'test_forever',
          message0: 'forever %1',
          args0: [{ type: 'input_statement', name: 'SUBSTACK' }],
          previousStatement: null,
        },
        {
          type: 'test_stack',
          message0: 'stack',
          previousStatement: null,
          nextStatement: null,
        },
      ])

      try {
        const foreverBlock = workspace.newBlock('test_forever')
        const topBlock = workspace.newBlock('test_stack')
        const bottomBlock = workspace.newBlock('test_stack')

        // Mark topBlock as an insertion marker
        topBlock.setInsertionMarker(true)

        assert(topBlock.nextConnection, 'topBlock should have nextConnection')
        assert(bottomBlock.previousConnection, 'bottomBlock should have previousConnection')
        topBlock.nextConnection.connect(bottomBlock.previousConnection)

        const ScratchChecker = Blockly.registry.getClass(
          Blockly.registry.Type.CONNECTION_CHECKER,
          Blockly.registry.DEFAULT,
        ) as ScratchCheckerCtor | null
        assert(ScratchChecker, 'Expected ScratchConnectionChecker to be registered')
        assert(foreverBlock.previousConnection, 'foreverBlock should have previousConnection')
        const result = new ScratchChecker().doDragChecks(
          foreverBlock.previousConnection,
          topBlock.nextConnection,
          Infinity,
        )
        expect(result).toBe(false)
      } finally {
        delete Blockly.Blocks.test_forever
        delete Blockly.Blocks.test_stack
      }
    })
  })

  describe('doDragChecks — procedures_prototype inputs', () => {
    it('prevents dragging any block into a procedures_prototype input', () => {
      Blockly.defineBlocksWithJsonArray([
        {
          type: 'procedures_prototype',
          message0: '%1',
          args0: [{ type: 'input_value', name: 'ARG0' }],
        },
        {
          type: 'test_output_block',
          message0: 'output',
          output: null,
        },
      ])

      try {
        const protoBlock = workspace.newBlock('procedures_prototype')
        const otherBlock = workspace.newBlock('test_output_block')

        const protoConn = protoBlock.getInput('ARG0')?.connection
        const otherConn = otherBlock.outputConnection
        assert(protoConn, 'Expected procedures_prototype to have an ARG0 connection')
        assert(otherConn, 'Expected block to have an output connection')

        const ScratchChecker = Blockly.registry.getClass(
          Blockly.registry.Type.CONNECTION_CHECKER,
          Blockly.registry.DEFAULT,
        ) as ScratchCheckerCtor | null
        assert(ScratchChecker, 'Expected ScratchConnectionChecker to be registered')
        const result = new ScratchChecker().doDragChecks(otherConn, protoConn, 0)
        expect(result).toBe(false)
      } finally {
        delete Blockly.Blocks.procedures_prototype
        delete Blockly.Blocks.test_output_block
      }
    })
  })
})
