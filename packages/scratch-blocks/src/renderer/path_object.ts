/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'

/**
 * An object that handles creating and setting each of the SVG elements
 * used by the renderer.
 */
export class PathObject extends Blockly.zelos.PathObject {
  /**
   * Apply the stored colours to the block's path, taking into account whether
   * the paths belong to a shadow block.
   * @param block The source block.
   */
  override applyColour(block: Blockly.BlockSvg) {
    super.applyColour(block)

    // The prototype block is no longer a Blockly shadow, but it should still
    // visually appear as one (using colourSecondary, the shadow fill colour).
    if (block.type === 'procedures_prototype') {
      this.svgPath.setAttribute('fill', this.style.colourSecondary)
    }

    // Argument reporter blocks sit inside the prototype (which now renders with
    // the shadow/secondary colour), so they need the full primary colour to
    // stand out, just as they did when the prototype was a real shadow block.
    if (block.type === 'argument_reporter_string_number' || block.type === 'argument_reporter_boolean') {
      this.svgPath.setAttribute('fill', this.style.colourPrimary)
    }
  }
}
