/**
 * @license
 * Copyright 2025 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";

// Hack to track whether we've already added a face to this block.
// If the face looks too dark/opaque, there may be multiple faces being added.
// TODO: is there a better place to put this flag, or a good way to add-or-update a specific BlockSvg child?
// The face can't just be part of the inline or outline paths because it has different attributes.
export interface CatBlockSvg extends Blockly.BlockSvg {
  hasFace: boolean;
}
