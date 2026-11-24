/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeEach, describe, expect, it } from 'vitest'
// Registers the C-block wrapping fix.
import '../../src/scratch_c_block_wrap'

let workspace: Blockly.Workspace

beforeEach(() => {
  workspace = new Blockly.Workspace()
})

afterEach(() => {
  workspace.dispose()
})

describe('C-block wrapping', () => {
  const BLOCK_TYPES = ['test_c_block_wrap', 'test_c_cap_block', 'test_stmt_wrap_inner', 'test_stmt_wrap_outer']

  beforeEach(() => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'test_c_block_wrap',
        message0: 'repeat %1',
        args0: [{ type: 'input_statement', name: 'SUBSTACK' }],
        previousStatement: null,
        nextStatement: null,
      },
      {
        type: 'test_c_cap_block',
        message0: 'forever %1',
        args0: [{ type: 'input_statement', name: 'SUBSTACK' }],
        previousStatement: null,
        // no nextStatement — like "forever", this block has no bottom connector
      },
      {
        type: 'test_stmt_wrap_inner',
        message0: 'inner block',
        previousStatement: null,
        nextStatement: null,
      },
      {
        type: 'test_stmt_wrap_outer',
        message0: 'outer block',
        previousStatement: null,
        nextStatement: null,
      },
    ])
  })

  afterEach(() => {
    for (const type of BLOCK_TYPES) {
      delete Blockly.Blocks[type]
    }
  })

  it('displaced block goes into statement input when C-block is dropped onto a middle-of-stack block (actual drop)', () => {
    // Stack: outerBlock → innerBlock
    const cBlock = workspace.newBlock('test_c_block_wrap')
    const outerBlock = workspace.newBlock('test_stmt_wrap_outer')
    const innerBlock = workspace.newBlock('test_stmt_wrap_inner')

    // Connect outerBlock → innerBlock (innerBlock is connected inside an existing stack)
    assert(outerBlock.nextConnection, 'outerBlock should have nextConnection')
    assert(innerBlock.previousConnection, 'innerBlock should have previousConnection')
    outerBlock.nextConnection.connect(innerBlock.previousConnection)

    // Simulate the scenario: the C-block's previous connects to outerBlock's next,
    // displacing innerBlock. Where should innerBlock (the orphan) go?
    //
    // Expected (wrap behavior): into cBlock's statement input (SUBSTACK)
    // Actual before fix (bug):   after cBlock's next connection
    const result = Blockly.Connection.getConnectionForOrphanedConnection(cBlock, innerBlock.previousConnection)

    const statementInputConn = cBlock.getInput('SUBSTACK')?.connection
    assert(statementInputConn, 'cBlock should have a SUBSTACK statement input with a connection')

    expect(result).toBe(statementInputConn)
  })

  it('hideInsertionMarker restores displaced block from statement input so stack heals correctly', () => {
    // When a C-block insertion marker is mid-stack with the displaced block (B2)
    // sitting in its statement input (as placed by our getConnectionForOrphanedConnection
    // patch), hideInsertionMarker must move B2 back to marker.nextConnection so that
    // marker.unplug(true) can reconnect B1 → B2 when the preview is dismissed.
    const b1 = workspace.newBlock('test_stmt_wrap_outer')
    const marker = workspace.newBlock('test_c_block_wrap')
    const b2 = workspace.newBlock('test_stmt_wrap_inner')

    marker.setInsertionMarker(true)

    // B1 → marker (marker is mid-stack)
    assert(b1.nextConnection, 'b1 should have nextConnection')
    assert(marker.previousConnection, 'marker should have previousConnection')
    b1.nextConnection.connect(marker.previousConnection)

    // B2 is in the marker's statement input (placed there by our orphan-connection patch)
    const markerStatementConn = marker.getInput('SUBSTACK')?.connection
    assert(markerStatementConn, 'marker should have a SUBSTACK statement input')
    assert(b2.previousConnection, 'b2 should have previousConnection')
    markerStatementConn.connect(b2.previousConnection)

    // The original hideInsertionMarker does not use `this`, so any object works as context.
    ;(Blockly.InsertionMarkerPreviewer.prototype as any).hideInsertionMarker.call({}, marker.previousConnection)

    // After cleanup, the stack should be healed: B1 → B2 (marker was disposed)
    expect(b1.nextConnection.targetBlock()).toBe(b2)
  })

  it('hideInsertionMarker restores displaced block when block has no bottom connector (e.g. forever)', () => {
    // A block like "forever" has no nextConnection (no bottom connector).
    // When its insertion marker is cleaned up, the displaced block must be
    // reconnected directly to the connection above the marker.
    const b1 = workspace.newBlock('test_stmt_wrap_outer')
    const marker = workspace.newBlock('test_c_cap_block')
    const b2 = workspace.newBlock('test_stmt_wrap_inner')

    marker.setInsertionMarker(true)

    // B1 → marker (marker is mid-stack)
    assert(b1.nextConnection, 'b1 should have nextConnection')
    assert(marker.previousConnection, 'marker should have previousConnection')
    expect(marker.nextConnection).toBeNull()
    b1.nextConnection.connect(marker.previousConnection)

    // B2 is in the marker's statement input
    const markerStatementConn = marker.getInput('SUBSTACK')?.connection
    assert(markerStatementConn, 'marker should have a SUBSTACK statement input')
    assert(b2.previousConnection, 'b2 should have previousConnection')
    markerStatementConn.connect(b2.previousConnection)
    ;(Blockly.InsertionMarkerPreviewer.prototype as any).hideInsertionMarker.call({}, marker.previousConnection)

    // After cleanup, the stack should be healed: B1 → B2
    expect(b1.nextConnection.targetBlock()).toBe(b2)
  })

  it('hideInsertionMarker restores displaced block when marker is inside a statement input (not a next-connection chain)', () => {
    // When a forever marker is inside another C-block's statement input
    // (rather than chained via nextConnection), targetConnection is the
    // parent's statement input connection. The fix uses targetConnection
    // generically, so this should work the same way.
    const parent = workspace.newBlock('test_c_block_wrap')
    const marker = workspace.newBlock('test_c_cap_block')
    const b2 = workspace.newBlock('test_stmt_wrap_inner')

    marker.setInsertionMarker(true)

    // Parent's SUBSTACK → marker (marker is inside a statement input)
    const parentSubstack = parent.getInput('SUBSTACK')?.connection
    assert(parentSubstack, 'parent should have a SUBSTACK statement input')
    assert(marker.previousConnection, 'marker should have previousConnection')
    expect(marker.nextConnection).toBeNull()
    parentSubstack.connect(marker.previousConnection)

    // B2 is in the marker's statement input
    const markerSubstack = marker.getInput('SUBSTACK')?.connection
    assert(markerSubstack, 'marker should have a SUBSTACK statement input')
    assert(b2.previousConnection, 'b2 should have previousConnection')
    markerSubstack.connect(b2.previousConnection)
    ;(Blockly.InsertionMarkerPreviewer.prototype as any).hideInsertionMarker.call({}, marker.previousConnection)

    // After cleanup, B2 should be reconnected to the parent's SUBSTACK
    expect(parentSubstack.targetBlock()).toBe(b2)
  })

  it('displaced block goes into statement input even when C-block is an insertion marker (preview matches drop)', () => {
    // During drag preview, Blockly creates an insertion marker to visualise
    // where the dragged block will land.  getConnectionForOrphanedConnection
    // is called with the MARKER as startBlock.  We want the displaced block to
    // go into the marker's statement input so the preview matches the actual
    // drop result (B2 inside C, not after C).  A separate patch in
    // hideInsertionMarker restores B2 to nextConnection before cleanup so that
    // unplug(true) can heal the stack correctly when the preview is dismissed.
    const markerBlock = workspace.newBlock('test_c_block_wrap')
    markerBlock.setInsertionMarker(true)

    const outerBlock = workspace.newBlock('test_stmt_wrap_outer')
    const innerBlock = workspace.newBlock('test_stmt_wrap_inner')
    assert(outerBlock.nextConnection, 'outerBlock should have nextConnection')
    assert(innerBlock.previousConnection, 'innerBlock should have previousConnection')
    outerBlock.nextConnection.connect(innerBlock.previousConnection)

    const result = Blockly.Connection.getConnectionForOrphanedConnection(markerBlock, innerBlock.previousConnection)

    const statementInputConn = markerBlock.getInput('SUBSTACK')?.connection
    assert(statementInputConn, 'markerBlock should have a SUBSTACK statement input with a connection')

    // Should redirect the orphan into the statement input (same as a real block).
    expect(result).toBe(statementInputConn)
  })
})
