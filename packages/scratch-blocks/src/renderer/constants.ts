/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";

export class ConstantProvider extends Blockly.zelos.ConstantProvider {
  REPLACEMENT_GLOW_COLOUR = "#ffffff";
  SELECTED_GLOW_COLOUR = "#ffffff";

  /**
   * Sets the visual theme used to render the workspace.
   * This method also synthesizes a "selected" theme, used to color blocks with
   * dropdown menus when the menu is active. Additionally, if the theme's block
   * styles contain any raw color values, corresponding CSS variables will be
   * created/overridden so that those colors can be dynamically referenced in
   * stylesheets.
   *
   * @param theme The new theme to apply.
   */
  setTheme(theme: Blockly.Theme) {
    const root = document.querySelector(":root") as HTMLElement;
    for (const [key, colour] of Object.entries(theme.blockStyles)) {
      if (typeof colour !== "object") {
        const varKey = `--colour-${key}`;
        root.style.setProperty(varKey, colour);
      } else {
        const style = {
          colourPrimary:
            "colourQuaternary" in colour
              ? `${colour.colourQuaternary}`
              : colour.colourTertiary,
          colourSecondary:
            "colourQuaternary" in colour
              ? `${colour.colourQuaternary}`
              : colour.colourTertiary,
          colourTertiary:
            "colourQuaternary" in colour
              ? `${colour.colourQuaternary}`
              : colour.colourTertiary,
          colourQuaternary:
            "colourQuaternary" in colour
              ? `${colour.colourQuaternary}`
              : colour.colourTertiary,
          hat: "",
        };
        theme.setBlockStyle(`${key}_selected`, style);
      }
    }
    super.setTheme(theme);
  }

  createDom(svg: SVGElement, tagName: string, selector: string) {
    super.createDom(svg, tagName, selector);
    this.selectedGlowFilterId = "";
  }
}
