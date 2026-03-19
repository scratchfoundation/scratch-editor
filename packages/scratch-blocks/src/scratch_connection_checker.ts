/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'

/**
 * Custom connection checker to restrict which blocks can be connected.
 */
class ScratchConnectionChecker extends Blockly.ConnectionChecker {
  override canConnectWithReason(
    a: Blockly.Connection | null,
    b: Blockly.Connection | null,
    isDragging: boolean,
    opt_distance?: number,
  ): number {
    // The prototype's next connection is visual-only and should not accept any connections.
    const isPrototypeNextConn = (c: Blockly.Connection | null) =>
      c?.type === Blockly.ConnectionType.NEXT_STATEMENT &&
      c.getSourceBlock().type === 'procedures_prototype'
    if (isPrototypeNextConn(a) || isPrototypeNextConn(b)) {
      return Blockly.Connection.REASON_CHECKS_FAILED
    }
    return super.canConnectWithReason(a, b, isDragging, opt_distance)
  }

  /**
   * Returns whether or not the two connections should be allowed to connect.
   * @param a One of the connections to check.
   * @param b The other connection to check.
   * @param distance The maximum allowable distance between connections.
   * @returns True if the connections should be allowed to connect.
   */
  doDragChecks(a: Blockly.RenderedConnection, b: Blockly.RenderedConnection, distance: number): boolean {
    // This check prevents dragging a block into the slot occupied by the
    // procedure caller example block in a procedure definition block.
    if (b.getSourceBlock().type === 'procedures_definition' && b.getParentInput()?.name === 'custom_block') {
      return false
    }

    // Prevent dragging any block into a procedures_prototype input. Argument
    // reporters inside the prototype are managed programmatically and should
    // not be displaceable by user drag-and-drop.
    if (b.getSourceBlock().type === 'procedures_prototype') {
      return false
    }

    return super.doDragChecks(a, b, distance)
  }
}

Blockly.registry.register(
  Blockly.registry.Type.CONNECTION_CHECKER,
  Blockly.registry.DEFAULT,
  ScratchConnectionChecker,
  true,
)
