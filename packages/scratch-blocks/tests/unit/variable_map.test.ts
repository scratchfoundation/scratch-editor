/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '../../src/scratch_variable_map'
import { ScratchVariableModel } from '../../src/scratch_variable_model'

// Tests for ScratchVariableMap and ScratchVariableModel — the scratch-blocks
// overrides of Blockly's variable storage.

let workspace: Blockly.Workspace
let variableMap: Blockly.VariableMap

beforeEach(() => {
  workspace = new Blockly.Workspace()
  variableMap = workspace.getVariableMap()
})

afterEach(() => {
  workspace.dispose()
})

describe('ScratchVariableMap.getVariable — case-sensitive lookup', () => {
  // Blockly's default VariableMap.getVariable is case-insensitive.
  // ScratchVariableMap overrides it to be case-sensitive, matching Scratch
  // semantics (where "Foo" and "foo" are distinct variables).

  it('finds a variable by exact name', () => {
    const v = variableMap.createVariable('myVar', '', 'id1')
    expect(variableMap.getVariable('myVar', '')).toBe(v)
  })

  it('does NOT find a variable when the case differs', () => {
    variableMap.createVariable('myVar', '', 'id1')
    expect(variableMap.getVariable('MYVAR', '')).toBeNull()
    expect(variableMap.getVariable('myvar', '')).toBeNull()
    expect(variableMap.getVariable('MyVar', '')).toBeNull()
  })

  it('treats two variables that differ only in case as distinct', () => {
    const lower = variableMap.createVariable('speed', '', 'id1')
    const upper = variableMap.createVariable('Speed', '', 'id2')
    expect(variableMap.getVariable('speed', '')).toBe(lower)
    expect(variableMap.getVariable('Speed', '')).toBe(upper)
  })

  it('still filters by type', () => {
    variableMap.createVariable('x', 'list', 'id1')
    expect(variableMap.getVariable('x', '')).toBeNull()
    expect(variableMap.getVariable('x', 'list')).not.toBeNull()
  })
})

describe('ScratchVariableModel', () => {
  it('defaults isLocal to false and isCloud to false', () => {
    const model = new ScratchVariableModel(workspace, 'myVar', '', 'id1')
    expect(model.isLocal).toBe(false)
    expect(model.isCloud).toBe(false)
  })

  it('stores isLocal when provided', () => {
    const model = new ScratchVariableModel(workspace, 'myVar', '', 'id1', true)
    expect(model.isLocal).toBe(true)
    expect(model.isCloud).toBe(false)
  })

  it('stores isCloud when provided', () => {
    const model = new ScratchVariableModel(workspace, 'myVar', '', 'id1', false, true)
    expect(model.isLocal).toBe(false)
    expect(model.isCloud).toBe(true)
  })

  it('inherits name, type, and id from VariableModel', () => {
    const model = new ScratchVariableModel(workspace, 'score', 'list', 'abc')
    expect(model.getName()).toBe('score')
    expect(model.type).toBe('list')
    expect(model.getId()).toBe('abc')
  })
})
