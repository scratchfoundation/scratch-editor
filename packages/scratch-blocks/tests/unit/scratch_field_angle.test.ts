/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { registerScratchFieldAngle } from '../../src/fields/scratch_field_angle'

type ScratchFieldAngleForTest = Blockly.FieldNumber & {
  mouseDownWrapper_?: Blockly.browserEvents.Data
  mouseMoveWrapper?: Blockly.browserEvents.Data
  mouseUpWrapper?: Blockly.browserEvents.Data
  onMouseUp(): void
}

const makeField = () =>
  Blockly.fieldRegistry.TEST_ONLY.fromJsonInternal({
    type: 'field_angle',
    angle: 90,
  }) as ScratchFieldAngleForTest

beforeAll(() => {
  registerScratchFieldAngle()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ScratchFieldAngle', () => {
  it('does not unbind drag listeners again after mouseup', () => {
    const field = makeField()
    const mouseMoveWrapper = [{}] as Blockly.browserEvents.Data
    const mouseUpWrapper = [{}] as Blockly.browserEvents.Data
    field.mouseMoveWrapper = mouseMoveWrapper
    field.mouseUpWrapper = mouseUpWrapper

    const unbind = vi.spyOn(Blockly.browserEvents, 'unbind').mockReturnValue(() => {})

    field.onMouseUp()
    expect(field.mouseMoveWrapper).toBeUndefined()
    expect(field.mouseUpWrapper).toBeUndefined()

    field.dispose()

    expect(unbind).toHaveBeenCalledTimes(2)
    expect(unbind).toHaveBeenCalledWith(mouseMoveWrapper)
    expect(unbind).toHaveBeenCalledWith(mouseUpWrapper)
  })

  it('does not unbind drag listeners again on a second mouseup', () => {
    const field = makeField()
    const mouseMoveWrapper = [{}] as Blockly.browserEvents.Data
    const mouseUpWrapper = [{}] as Blockly.browserEvents.Data
    field.mouseMoveWrapper = mouseMoveWrapper
    field.mouseUpWrapper = mouseUpWrapper

    const unbind = vi.spyOn(Blockly.browserEvents, 'unbind').mockReturnValue(() => {})

    field.onMouseUp()
    field.onMouseUp()

    expect(unbind).toHaveBeenCalledTimes(2)
    expect(unbind).toHaveBeenCalledWith(mouseMoveWrapper)
    expect(unbind).toHaveBeenCalledWith(mouseUpWrapper)
  })

  it('unbinds all wrappers on dispose during a drag', () => {
    const field = makeField()
    const mouseDownWrapper = [{}] as Blockly.browserEvents.Data
    const mouseMoveWrapper = [{}] as Blockly.browserEvents.Data
    const mouseUpWrapper = [{}] as Blockly.browserEvents.Data
    field.mouseDownWrapper_ = mouseDownWrapper
    field.mouseMoveWrapper = mouseMoveWrapper
    field.mouseUpWrapper = mouseUpWrapper

    const unbind = vi.spyOn(Blockly.browserEvents, 'unbind').mockReturnValue(() => {})

    field.dispose()

    expect(field.mouseDownWrapper_).toBeUndefined()
    expect(field.mouseMoveWrapper).toBeUndefined()
    expect(field.mouseUpWrapper).toBeUndefined()
    expect(unbind).toHaveBeenCalledTimes(3)
    expect(unbind).toHaveBeenCalledWith(mouseDownWrapper)
    expect(unbind).toHaveBeenCalledWith(mouseMoveWrapper)
    expect(unbind).toHaveBeenCalledWith(mouseUpWrapper)
  })

  it('does not unbind wrappers again on a second dispose', () => {
    const field = makeField()
    const mouseDownWrapper = [{}] as Blockly.browserEvents.Data
    const mouseMoveWrapper = [{}] as Blockly.browserEvents.Data
    const mouseUpWrapper = [{}] as Blockly.browserEvents.Data
    field.mouseDownWrapper_ = mouseDownWrapper
    field.mouseMoveWrapper = mouseMoveWrapper
    field.mouseUpWrapper = mouseUpWrapper

    const unbind = vi.spyOn(Blockly.browserEvents, 'unbind').mockReturnValue(() => {})

    field.dispose()
    field.dispose()

    expect(unbind).toHaveBeenCalledTimes(3)
    expect(unbind).toHaveBeenCalledWith(mouseDownWrapper)
    expect(unbind).toHaveBeenCalledWith(mouseMoveWrapper)
    expect(unbind).toHaveBeenCalledWith(mouseUpWrapper)
  })
})
