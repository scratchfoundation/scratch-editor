/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'

class ScratchFieldDropdown extends Blockly.FieldDropdown {
  private originalStyle!: string

  /**
   * Accept string values even when they are not in the current options list.
   * Scratch populates some dropdowns from dynamic data (e.g. the sprite list
   * for motion_goto_menu, motion_pointtowards_menu, sensing_touchingobject_menu)
   * and deliberately excludes the currently-editing sprite. A block moved into
   * the sprite it now targets carries a stored value that is therefore absent
   * from the option list for this editing context, but is still valid — the
   * runtime reads the stored value directly. Preserve that value so the UI
   * shows what the block actually does, rather than silently reverting to the
   * first option.
   * @param newValue The value to validate.
   * @returns The value unchanged if it is a string; otherwise null to reject
   *     the update.
   */
  protected override doClassValidation_(newValue?: string): string | null {
    if (typeof newValue !== 'string') {
      return null
    }
    return newValue
  }

  /**
   * When the stored value is not in the current options list, display the raw
   * value. Blockly's base implementation reads from the last-matched option,
   * which stays stale when the incoming value does not appear in the list, so
   * the default would otherwise render as the first option's text.
   * @returns Text to display for the currently-selected value.
   */
  protected override getText_(): string | null {
    const value = this.getValue()
    if (value === null) {
      return super.getText_()
    }
    for (const option of this.getOptions(true)) {
      if (option === 'separator') continue
      if (option[1] === value) {
        // Delegate to the base for the matched case so image/HTMLElement
        // option types render correctly.
        return super.getText_()
      }
    }
    return value
  }

  showEditor_(event: PointerEvent) {
    super.showEditor_(event)
    const sourceBlock = this.getSourceBlock() as Blockly.BlockSvg
    const style = sourceBlock.style
    if (sourceBlock.isShadow()) {
      this.originalStyle = sourceBlock.getStyleName()
      sourceBlock.setStyle(`${this.originalStyle}_selected`)
    } else if (this.borderRect_) {
      this.borderRect_.setAttribute(
        'fill',
        'colourQuaternary' in style ? String(style.colourQuaternary) : style.colourTertiary,
      )
    }
  }

  dropdownDispose_() {
    super.dropdownDispose_()
    const sourceBlock = this.getSourceBlock()
    if (!sourceBlock) {
      console.error('[scratch_field_dropdown] Missing source block in dropdownDispose_')
      return
    }
    if (sourceBlock.isShadow()) {
      sourceBlock.setStyle(this.originalStyle)
    }
  }
}

/**
 * Register the field and any dependencies.
 */
export function registerScratchFieldDropdown() {
  Blockly.fieldRegistry.unregister('field_dropdown')
  Blockly.fieldRegistry.register('field_dropdown', ScratchFieldDropdown)
}
