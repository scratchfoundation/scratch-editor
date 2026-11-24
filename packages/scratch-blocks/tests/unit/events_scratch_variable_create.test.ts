/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '../../src/events/events_scratch_variable_create'
import '../../src/scratch_variable_map'
import { ScratchVariableModel } from '../../src/scratch_variable_model'

type ScratchVarCreateCtor = new (v?: ScratchVariableModel) => {
  isLocal: boolean
  isCloud: boolean
  toJson(): { isLocal: boolean; isCloud: boolean }
  run(forward: boolean): void
}

// Tests for ScratchVariableCreate — a scratch-blocks-specific event that
// extends VarCreate to carry the isLocal and isCloud flags.

let workspace: Blockly.Workspace

beforeEach(() => {
  workspace = new Blockly.Workspace()
})

afterEach(() => {
  workspace.dispose()
})

function makeScratchVar(name: string, isLocal = false, isCloud = false): ScratchVariableModel {
  return new ScratchVariableModel(workspace, name, '', Blockly.utils.idGenerator.genUid(), isLocal, isCloud)
}

describe('ScratchVariableCreate constructor', () => {
  it('copies isLocal and isCloud from the ScratchVariableModel', () => {
    const variable = makeScratchVar('score', true, false)
    // ScratchVariableCreate is registered as the VAR_CREATE event class.
    const EventClass = Blockly.Events.get(Blockly.Events.VAR_CREATE) as ScratchVarCreateCtor
    const event = new EventClass(variable)
    expect(event.isLocal).toBe(true)
    expect(event.isCloud).toBe(false)
  })

  it('stores isCloud=true when the variable is a cloud variable', () => {
    const variable = makeScratchVar('highScore', false, true)
    const EventClass = Blockly.Events.get(Blockly.Events.VAR_CREATE) as ScratchVarCreateCtor
    const event = new EventClass(variable)
    expect(event.isLocal).toBe(false)
    expect(event.isCloud).toBe(true)
  })
})

describe('ScratchVariableCreate.toJson', () => {
  it('serialises isLocal and isCloud into the JSON representation', () => {
    const variable = makeScratchVar('localVar', true, false)
    const EventClass = Blockly.Events.get(Blockly.Events.VAR_CREATE) as ScratchVarCreateCtor
    const event = new EventClass(variable)
    const json = event.toJson()
    expect(json.isLocal).toBe(true)
    expect(json.isCloud).toBe(false)
  })
})

describe('ScratchVariableCreate.run', () => {
  it('run(true) creates a ScratchVariableModel with the correct isLocal/isCloud flags', () => {
    const variable = makeScratchVar('myVar', true, false)
    const EventClass = Blockly.Events.get(Blockly.Events.VAR_CREATE) as ScratchVarCreateCtor
    const event = new EventClass(variable)
    // Detach from workspace so run() can re-create it.
    workspace.getVariableMap().deleteVariable(variable)

    Blockly.Events.disable()
    try {
      event.run(true)
    } finally {
      Blockly.Events.enable()
    }

    const created = workspace.getVariableMap().getVariableById(variable.getId()) as ScratchVariableModel
    expect(created).not.toBeNull()
    expect(created.isLocal).toBe(true)
    expect(created.isCloud).toBe(false)
  })

  it('run(false) removes the variable from the workspace', () => {
    const variable = makeScratchVar('myVar', false, false)
    workspace.getVariableMap().addVariable(variable)
    const EventClass = Blockly.Events.get(Blockly.Events.VAR_CREATE) as ScratchVarCreateCtor
    const event = new EventClass(variable)

    Blockly.Events.disable()
    try {
      event.run(false)
    } finally {
      Blockly.Events.enable()
    }

    expect(workspace.getVariableMap().getVariableById(variable.getId())).toBeNull()
  })
})
