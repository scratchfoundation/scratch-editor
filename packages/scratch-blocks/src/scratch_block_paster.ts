/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { stripIds } from './scratch_blocks_utils'
import type { ScratchCommentIcon } from './scratch_comment_icon'

/**
 * Class responsible for handling the pasting of copied blocks.
 */
class ScratchBlockPaster extends Blockly.clipboard.BlockPaster {
  /**
   * Deserializes the given block data onto the workspace.
   * @param copyData The serialized block state to create a copy of on the
   *     workspace.
   * @param workspace The workspace to paste the block onto.
   * @param coordinate The location to paste the block.
   * @returns The newly pasted block, or undefined if pasting failed.
   */
  paste(
    copyData: Blockly.clipboard.BlockCopyData,
    workspace: Blockly.WorkspaceSvg,
    coordinate: Blockly.utils.Coordinate,
  ) {
    // Strip all block IDs so that every block in the pasted tree (including
    // shadows) gets a fresh ID. Without this, disposed shadows from the
    // original block can reuse the same ID, causing the VM to think both
    // blocks share the same shadow. Deleting one then destroys the other's
    // shadow (forum topic 878291).
    copyData = { ...copyData, blockState: stripIds(copyData.blockState) }
    const block = super.paste(copyData, workspace, coordinate)
    if (block?.type === 'argument_reporter_boolean' || block?.type === 'argument_reporter_string_number') {
      block.setDragStrategy(new Blockly.dragging.BlockDragStrategy(block))
    }

    // Deserialization of blocks suppresses events, so even though this gets
    // fired for blocks with comments, the VM will never receive it, causing its
    // state to get out of sync. Manually fire it here (after suppression has
    // been turned off) if needed.
    const commentIcon = block?.getIcon(Blockly.icons.IconType.COMMENT)
    if (commentIcon) {
      ;(commentIcon as ScratchCommentIcon).fireCreateEvent()
    }

    return block
  }
}

/**
 * Unregisters the default block paster and registers ScratchBlockPaster in its
 * place.
 */
export function registerScratchBlockPaster() {
  Blockly.clipboard.registry.unregister(ScratchBlockPaster.TYPE)
  Blockly.clipboard.registry.register(ScratchBlockPaster.TYPE, new ScratchBlockPaster())
}
