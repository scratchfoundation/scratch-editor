/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";

/**
 * Class responsible for handling the pasting of copied blocks.
 */
class ScratchBlockPaster extends Blockly.clipboard.BlockPaster {
  /**
   * Deserializes the given block data onto the workspace.
   *
   * @param copyData The serialized block state to create a copy of on the
   *     workspace.
   * @param workspace The workspace to paste the block onto.
   * @param coordinate The location to paste the block.
   */
  paste(
    copyData: Blockly.clipboard.BlockCopyData,
    workspace: Blockly.WorkspaceSvg,
    coordinate: Blockly.utils.Coordinate
  ) {
    const block = super.paste(copyData, workspace, coordinate);
    if (
      block?.type === "argument_reporter_boolean" ||
      block?.type === "argument_reporter_string_number"
    ) {
      block.setDragStrategy(new Blockly.dragging.BlockDragStrategy(block));
    }

    return block;
  }
}

/**
 * Unregisters the default block paster and registers ScratchBlockPaster in its
 * place.
 */
export function registerScratchBlockPaster() {
  Blockly.clipboard.registry.unregister(ScratchBlockPaster.TYPE);
  Blockly.clipboard.registry.register(
    ScratchBlockPaster.TYPE,
    new ScratchBlockPaster()
  );
}
