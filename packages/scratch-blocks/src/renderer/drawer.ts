/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";
import type { RenderInfo } from "./render_info";
import { ConstantProvider } from "./constants";

export class Drawer extends Blockly.zelos.Drawer {
  constants_: ConstantProvider;
  info_: RenderInfo;

  override drawStatementInput_(row: Blockly.blockRendering.Row) {
    if (this.info_.isBowlerHatBlock()) {
      // Bowler hat blocks have straight sides with no C-shape/indentation for
      // statement blocks.
      this.drawRightSideRow_(row);
      this.positionStatementInputConnection_(row);
    } else {
      super.drawStatementInput_(row);
    }
  }

  override drawRightSideRow_(row: Blockly.blockRendering.Row) {
    if (
      this.info_.isBowlerHatBlock() &&
      Blockly.blockRendering.Types.isSpacer(row)
    ) {
      // Multi-row bowler hat blocks are not supported, this may need
      // adjustment to do so.
      this.outlinePath_ += Blockly.utils.svgPaths.lineOnAxis(
        "V",
        row.yPos + row.height
      );
    } else {
      super.drawRightSideRow_(row);
    }
  }

  override drawTop_() {
    super.drawTop_();
    // This is a horrible hack, but the superclass' implementation of drawTop_()
    // provides no way to cleanly override a hat's path without copying and
    // pasting the entire implementation here. We know that there will only be
    // one hat on a block, and its path is a known constant, so we just find and
    // replace it with the desired bowler hat path here.
    // If https://github.com/RaspberryPiFoundation/blockly/issues/7292 is
    // resolved, this should be revisited.
    const replacementTop = this.makeReplacementTop_();
    if (replacementTop) {
      const capHatPath = this.constants_.START_HAT.path;
      this.outlinePath_ = this.outlinePath_.replace(capHatPath, replacementTop);
    }
  }

  makeReplacementTop_() {
    if (this.info_.isBowlerHatBlock()) {
      return this.constants_.makeBowlerHatPath(this.info_.width);
    }
  }
}
