/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";
import { CheckboxBubble } from "./checkbox_bubble";

/**
 * Invisible icon that exists solely to host the corresponding checkbox bubble.
 */
export class FlyoutCheckboxIcon implements Blockly.IIcon, Blockly.IHasBubble {
  private checkboxBubble: CheckboxBubble;
  private type = new Blockly.icons.IconType("checkbox");

  constructor(private sourceBlock: Blockly.BlockSvg) {
    if (this.sourceBlock.workspace.isFlyout) {
      this.checkboxBubble = new CheckboxBubble(this.sourceBlock);
    }
  }

  getType(): Blockly.icons.IconType<FlyoutCheckboxIcon> {
    return this.type;
  }

  getWeight(): number {
    return -1;
  }

  getSize(): Blockly.utils.Size {
    // Awful hack to cancel out the default padding added to icons.
    return new Blockly.utils.Size(-8, 0);
  }

  isShownWhenCollapsed(): boolean {
    return false;
  }

  isClickableInFlyout(): boolean {
    return false;
  }

  bubbleIsVisible(): boolean {
    return this.sourceBlock.workspace.isFlyout;
  }

  onLocationChange(blockOrigin: Blockly.utils.Coordinate) {
    this.checkboxBubble?.updateLocation();
  }

  setChecked(checked: boolean) {
    this.checkboxBubble?.setChecked(checked);
  }

  dispose() {
    this.checkboxBubble?.dispose();
  }

  // These methods are required by the interfaces, but intentionally have no
  // implementation, largely because this icon has no visual representation.
  applyColour() {}

  hideForInsertionMarker() {}

  updateEditable() {}

  updateCollapsed() {}

  setOffsetInBlock() {}

  onClick() {}

  async setBubbleVisible(visible: boolean) {}

  initView(pointerDownListener: (e: PointerEvent) => void) {}
}

Blockly.registry.register(
  Blockly.registry.Type.ICON,
  "checkbox",
  FlyoutCheckboxIcon,
  true
);
