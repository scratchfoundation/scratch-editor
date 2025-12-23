/**
 * @license
 * Copyright 2025 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";

import { ScratchRenderer } from "../renderer";
import type { RenderInfo } from "../render_info";

import type { CatBlockSvg } from "./cat_block_svg";
import { ConstantProvider } from "./constants";
import { Drawer } from "./drawer";

export class CatScratchRenderer extends ScratchRenderer {
  makeConstants_() {
    return new ConstantProvider();
  }

  makeDrawer_(block: Blockly.BlockSvg, info: RenderInfo) {
    return new Drawer(block as CatBlockSvg, info);
  }
}

Blockly.blockRendering.register("scratch_catblocks", CatScratchRenderer);
