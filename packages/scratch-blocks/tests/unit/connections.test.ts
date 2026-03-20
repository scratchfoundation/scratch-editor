/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeEach, describe, expect, it } from 'vitest'
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
      ])

      try {
        const protoBlock = workspace.newBlock('procedures_prototype')
        const otherBlock = workspace.newBlock('')
        otherBlock.setPreviousStatement(true)

        const protoConn = protoBlock.nextConnection
        const otherConn = otherBlock.previousConnection

        if (protoConn && otherConn) {
          // The default checker would not object, but ScratchConnectionChecker
          // should return REASON_CHECKS_FAILED.
          const ScratchChecker = Blockly.registry.getClass(
            Blockly.registry.Type.CONNECTION_CHECKER,
            Blockly.registry.DEFAULT,
          ) as ScratchCheckerCtor | null
          assert(ScratchChecker, 'Expected ScratchConnectionChecker to be registered')
          const result = new ScratchChecker().canConnectWithReason(protoConn, otherConn, false)
          expect(result).toBe(Blockly.Connection.REASON_CHECKS_FAILED)
        }
      } finally {
        delete Blockly.Blocks.procedures_prototype
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
      ])

      try {
        const defBlock = workspace.newBlock('procedures_definition')
        const otherBlock = workspace.newBlock('')
        otherBlock.setOutput(true)

        const defConn = defBlock.getInput('custom_block')?.connection
        const otherConn = otherBlock.outputConnection

        if (defConn && otherConn) {
          const ScratchChecker = Blockly.registry.getClass(
            Blockly.registry.Type.CONNECTION_CHECKER,
            Blockly.registry.DEFAULT,
          ) as ScratchCheckerCtor | null
          assert(ScratchChecker, 'Expected ScratchConnectionChecker to be registered')
          const result = new ScratchChecker().doDragChecks(otherConn, defConn, 0)
          expect(result).toBe(false)
        }
      } finally {
        delete Blockly.Blocks.procedures_definition
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
      ])

      try {
        const protoBlock = workspace.newBlock('procedures_prototype')
        const otherBlock = workspace.newBlock('')
        otherBlock.setOutput(true)

        const protoConn = protoBlock.getInput('ARG0')?.connection
        const otherConn = otherBlock.outputConnection

        if (protoConn && otherConn) {
          const ScratchChecker = Blockly.registry.getClass(
            Blockly.registry.Type.CONNECTION_CHECKER,
            Blockly.registry.DEFAULT,
          ) as ScratchCheckerCtor | null
          assert(ScratchChecker, 'Expected ScratchConnectionChecker to be registered')
          const result = new ScratchChecker().doDragChecks(otherConn, protoConn, 0)
          expect(result).toBe(false)
        }
      } finally {
        delete Blockly.Blocks.procedures_prototype
      }
    })
  })
})
