/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";
import { ContinuousToolbox } from "@blockly/continuous-toolbox";
import { ScratchContinuousCategory } from "./scratch_continuous_category";

/**
 * A toolbox that displays items from all categories in one scrolling list.
 */
export class ScratchContinuousToolbox extends ContinuousToolbox {
  /**
   * List of functions to run after the next time the toolbox renders.
   */
  private postRenderCallbacks: (() => void)[] = [];

  refreshSelection() {
    // Intentionally a no-op, Scratch manually manages refreshing the toolbox
    // via forceRerender().
  }

  /**
   * Gets the contents that should be shown in the flyout.
   *
   * @returns Flyout contents.
   */
  getInitialFlyoutContents_(): Blockly.utils.toolbox.FlyoutItemInfoArray {
    // TODO(#211) Clean this up when the continuous toolbox plugin is updated.
    let contents: Blockly.utils.toolbox.FlyoutItemInfoArray = [];
    for (const toolboxItem of this.getToolboxItems()) {
      if (toolboxItem instanceof ScratchContinuousCategory) {
        if (toolboxItem.shouldShowStatusButton()) {
          contents.push({
            kind: "STATUS_INDICATOR_LABEL",
            id: toolboxItem.getId(),
            text: toolboxItem.getName(),
          });
        } else {
          // Create a label node to go at the top of the category
          contents.push({ kind: "LABEL", text: toolboxItem.getName() });
        }
        let itemContents = toolboxItem.getContents();

        // Handle custom categories (e.g. variables and functions)
        if (typeof itemContents === "string") {
          itemContents = {
            custom: itemContents,
            kind: "CATEGORY",
          };
        }
        contents = contents.concat(itemContents);
      }
    }
    return contents;
  }

  /**
   * Forcibly rerenders the toolbox, preserving selection when possible.
   */
  forceRerender() {
    const selectedCategoryName = this.selectedItem_?.getName();
    super.refreshSelection();
    let callback;
    while ((callback = this.postRenderCallbacks.shift())) {
      callback();
    }
    this.selectCategoryByName(selectedCategoryName);
  }

  /**
   * Runs the specified callback after the next rerender.
   * @param callback A callback to run whenever the toolbox next rerenders.
   */
  runAfterRerender(callback: () => void) {
    this.postRenderCallbacks.push(callback);
  }
}
