/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ContinuousCategory } from '@blockly/continuous-toolbox'
import * as Blockly from 'blockly/core'

type StatusIndicatorCategoryInfo = Blockly.utils.toolbox.CategoryInfo & {
  showStatusButton?: string
}

/**
 * Selectable category shown in the Scratch toolbox.
 */
export class ScratchContinuousCategory extends ContinuousCategory {
  /**
   * Whether this toolbox category has a status indicator button on its label
   * in the flyout, typically for extensions that interface with hardware
   * devices.
   */
  private showStatusButton = false
  private iconURI?: string
  private secondaryColour?: string

  /**
   * Creates a new ScratchContinuousCategory.
   * @param toolboxItemDef A toolbox item definition.
   * @param parentToolbox The toolbox this category is being added to.
   * @param opt_parent The parent toolbox category, if any.
   */
  constructor(
    toolboxItemDef: StatusIndicatorCategoryInfo,
    parentToolbox: Blockly.Toolbox,
    opt_parent?: Blockly.ICollapsibleToolboxItem,
  ) {
    super(toolboxItemDef, parentToolbox, opt_parent)
    this.showStatusButton = toolboxItemDef.showStatusButton === 'true'
    const iconURI = 'iconURI' in toolboxItemDef ? toolboxItemDef.iconURI : undefined
    const secondaryColour = 'secondaryColour' in toolboxItemDef ? toolboxItemDef.secondaryColour : undefined
    this.iconURI = typeof iconURI === 'string' ? iconURI : undefined
    this.secondaryColour = typeof secondaryColour === 'string' ? secondaryColour : undefined
  }

  /**
   * Creates a DOM element for this category's icon.
   * @returns A DOM element for this category's icon.
   */
  createIconDom_(): Element {
    if (this.iconURI) {
      const icon = document.createElement('img')
      icon.src = this.iconURI
      icon.className = 'categoryIconBubble'
      return icon
    } else {
      const icon = super.createIconDom_()
      if (icon instanceof HTMLElement) {
        icon.style.border = `1px solid ${this.secondaryColour ?? ''}`
      }
      return icon
    }
  }

  /**
   * Sets whether or not this category is selected.
   * @param isSelected True if this category is selected.
   */
  setSelected(isSelected: boolean) {
    super.setSelected(isSelected)
    // Prevent hardcoding the background color to grey.
    if (this.rowDiv_) {
      this.rowDiv_.style.backgroundColor = ''
    }
  }

  /**
   * Returns whether or not this category's label in the flyout should display
   * status indicators.
   * @returns True if the status indicator button should be shown.
   */
  shouldShowStatusButton() {
    return this.showStatusButton
  }
}

/** Registers this toolbox category and unregisters the default one. */
export function registerScratchContinuousCategory() {
  const registrationName = ScratchContinuousCategory.registrationName
  Blockly.registry.unregister(Blockly.registry.Type.TOOLBOX_ITEM, registrationName)
  Blockly.registry.register(Blockly.registry.Type.TOOLBOX_ITEM, registrationName, ScratchContinuousCategory)
}
