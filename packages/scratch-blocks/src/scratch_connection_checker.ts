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
      c?.type === Blockly.ConnectionType.NEXT_STATEMENT && c.getSourceBlock().type === 'procedures_prototype'
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

    // Blockly's base doDragChecks rejects inserting a block with no
    // nextConnection into the middle of a stack (NEXT_STATEMENT case) because
    // it assumes the displaced blocks have nowhere to go. Our
    // getConnectionForOrphanedConnection patch routes displaced blocks into
    // statement inputs, so we allow the connection when a suitable statement
    // input exists on the dragging block.
    const bType: Blockly.ConnectionType = b.type
    if (
      bType === Blockly.ConnectionType.NEXT_STATEMENT &&
      b.isConnected() &&
      !(a.getSourceBlock() as Blockly.Block).nextConnection
    ) {
      const orphan = b.targetBlock()
      const orphanPrev = (orphan as Blockly.Block | null)?.previousConnection
      if (orphan && !orphan.isShadow() && orphanPrev) {
        const canWrap = !!Blockly.Connection.getConnectionForOrphanedConnection(a.getSourceBlock(), orphanPrev)
        if (canWrap) {
          // Skip the base class NEXT_STATEMENT check (which would reject
          // this) but still apply the other generic guards it uses.
          if ('distanceFrom' in a && a.distanceFrom(b) > distance) return false
          if (b.getSourceBlock().isInsertionMarker()) return false
          if (Blockly.common.draggingConnections.includes(b)) return false
          return true
        }
      }
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
