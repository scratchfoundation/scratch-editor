/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { registerScratchFieldAngle } from '../../src/fields/scratch_field_angle'

type ScratchFieldAngleForTest = Blockly.FieldNumber & {
  mouseMoveWrapper?: Blockly.browserEvents.Data
  mouseUpWrapper?: Blockly.browserEvents.Data
  onMouseUp(): void
}

beforeAll(() => {
  registerScratchFieldAngle()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ScratchFieldAngle', () => {
  it('does not unbind drag listeners again after mouseup', () => {
    const field = Blockly.fieldRegistry.TEST_ONLY.fromJsonInternal({
      type: 'field_angle',
      angle: 90,
    }) as ScratchFieldAngleForTest
    const mouseMoveWrapper = [{}] as Blockly.browserEvents.Data
    const mouseUpWrapper = [{}] as Blockly.browserEvents.Data
    field.mouseMoveWrapper = mouseMoveWrapper
    field.mouseUpWrapper = mouseUpWrapper

    const unbind = vi.spyOn(Blockly.browserEvents, 'unbind').mockImplementation(() => {})

    field.onMouseUp()
    field.dispose()

    expect(unbind).toHaveBeenCalledTimes(2)
    expect(unbind).toHaveBeenCalledWith(mouseMoveWrapper)
    expect(unbind).toHaveBeenCalledWith(mouseUpWrapper)
  })
})
