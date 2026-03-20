/**
 * Copyright 2026 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { afterEach, assert, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
// Load scratch-specific messages (required before block registration).
import { ScratchMsgs } from '../../msg/scratch_msgs'
import '../../src/blocks/procedures'
// Import scratch-specific block registrations.
import '../../src/blocks/vertical_extensions'
import '../../src/scratch_connection_checker'

beforeAll(() => {
  ScratchMsgs.setLocale('en')
})

// Browser tests for procedure block behavior that requires BlockSvg
// (setDragStrategy, showContextMenu). These cover PRs #3492 and #3493.

let container: HTMLElement
let workspace: Blockly.WorkspaceSvg

beforeEach(() => {
  container = document.createElement('div')
  container.style.width = '800px'
  container.style.height = '600px'
  document.body.appendChild(container)
  workspace = Blockly.inject(container, {})
})

afterEach(() => {
  workspace.dispose()
  container.remove()
  vi.restoreAllMocks()
})

function loadXml(xml: string): void {
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), workspace)
}

// ---------------------------------------------------------------------------
// PR #3493 regression: skipArgumentReporters_ during XML deserialization
// ---------------------------------------------------------------------------

describe('skipArgumentReporters_ — XML round-trip', () => {
  it('loading a 1-argument procedure from XML produces exactly 1 reporter (not 2)', () => {
    // A procedures_definition with a procedures_prototype that has one <value>
    // child (the arg reporter). Without the skipArgumentReporters_ fix,
    // updateDisplay_() would also create a reporter, resulting in 2.
    loadXml(`
      <xml>
        <block type="procedures_definition">
          <statement name="custom_block">
            <block type="procedures_prototype">
              <mutation
                proccode="test %s"
                argumentids='["arg1"]'
                argumentnames='["x"]'
                argumentdefaults='[""]'
                warp="false">
              </mutation>
              <value name="arg1">
                <block type="argument_reporter_string_number">
                  <field name="VALUE">x</field>
                </block>
              </value>
            </block>
          </statement>
        </block>
      </xml>
    `)

    // Total blocks: 1 definition + 1 prototype + 1 reporter = 3.
    // Before the fix: 1 definition + 1 prototype + 2 reporters (1 from XML,
    // 1 orphaned from updateDisplay_) = 4.
    expect(workspace.getAllBlocks(false)).toHaveLength(3)
  })

  it('loading a 2-argument procedure from XML produces exactly 2 reporters (not 4)', () => {
    loadXml(`
      <xml>
        <block type="procedures_definition">
          <statement name="custom_block">
            <block type="procedures_prototype">
              <mutation
                proccode="test %s %b"
                argumentids='["arg1","arg2"]'
                argumentnames='["x","flag"]'
                argumentdefaults='["","false"]'
                warp="false">
              </mutation>
              <value name="arg1">
                <block type="argument_reporter_string_number">
                  <field name="VALUE">x</field>
                </block>
              </value>
              <value name="arg2">
                <block type="argument_reporter_boolean">
                  <field name="VALUE">flag</field>
                </block>
              </value>
            </block>
          </statement>
        </block>
      </xml>
    `)

    // Total blocks: 1 definition + 1 prototype + 2 reporters = 4.
    // Before the fix: 1 + 1 + 4 (2 from XML, 2 orphaned) = 6.
    expect(workspace.getAllBlocks(false)).toHaveLength(4)
  })

  it('reporters are connected to prototype inputs, not floating', () => {
    loadXml(`
      <xml>
        <block type="procedures_definition">
          <statement name="custom_block">
            <block type="procedures_prototype">
              <mutation
                proccode="test %s"
                argumentids='["arg1"]'
                argumentnames='["x"]'
                argumentdefaults='[""]'
                warp="false">
              </mutation>
              <value name="arg1">
                <block type="argument_reporter_string_number">
                  <field name="VALUE">x</field>
                </block>
              </value>
            </block>
          </statement>
        </block>
      </xml>
    `)

    const allBlocks = workspace.getAllBlocks(false)
    const reporters = allBlocks.filter((b) => b.type === 'argument_reporter_string_number')
    expect(reporters).toHaveLength(1)
    // The reporter must be connected to a parent (the prototype), not floating.
    expect(reporters[0].getParent()).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PR #3492: context menu delegation
// ---------------------------------------------------------------------------

describe('context menu delegation', () => {
  it('right-clicking an arg reporter inside a prototype delegates to the definition', () => {
    loadXml(`
      <xml>
        <block type="procedures_definition">
          <statement name="custom_block">
            <block type="procedures_prototype">
              <mutation
                proccode="test %s"
                argumentids='["arg1"]'
                argumentnames='["x"]'
                argumentdefaults='[""]'
                warp="false">
              </mutation>
              <value name="arg1">
                <block type="argument_reporter_string_number">
                  <field name="VALUE">x</field>
                </block>
              </value>
            </block>
          </statement>
        </block>
      </xml>
    `)

    const allBlocks = workspace.getAllBlocks(false)
    const defBlock = allBlocks.find((b) => b.type === 'procedures_definition')
    assert(defBlock, 'Expected procedures_definition block')
    const reporter = allBlocks.find((b) => b.type === 'argument_reporter_string_number')
    assert(reporter, 'Expected argument_reporter_string_number block')

    const defMenuSpy = vi.fn()
    defBlock.showContextMenu = defMenuSpy

    const mockEvent = new PointerEvent('pointerdown')
    reporter.showContextMenu(mockEvent)

    expect(defMenuSpy).toHaveBeenCalledWith(mockEvent)
  })

  it('right-clicking a prototype delegates to the definition', () => {
    loadXml(`
      <xml>
        <block type="procedures_definition">
          <statement name="custom_block">
            <block type="procedures_prototype">
              <mutation
                proccode="test %s"
                argumentids='["arg1"]'
                argumentnames='["x"]'
                argumentdefaults='[""]'
                warp="false">
              </mutation>
              <value name="arg1">
                <block type="argument_reporter_string_number">
                  <field name="VALUE">x</field>
                </block>
              </value>
            </block>
          </statement>
        </block>
      </xml>
    `)

    const allBlocks = workspace.getAllBlocks(false)
    const defBlock = allBlocks.find((b) => b.type === 'procedures_definition')
    assert(defBlock, 'Expected procedures_definition block')
    const proto = allBlocks.find((b) => b.type === 'procedures_prototype')
    assert(proto, 'Expected procedures_prototype block')

    const defMenuSpy = vi.fn()
    defBlock.showContextMenu = defMenuSpy

    const mockEvent = new PointerEvent('pointerdown')
    proto.showContextMenu(mockEvent)

    expect(defMenuSpy).toHaveBeenCalledWith(mockEvent)
  })

  it('right-clicking a reporter that has been dragged out keeps its own context menu', () => {
    // Create a reporter that is NOT inside a prototype (no parent of type procedures_prototype).
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'argument_reporter_string_number_outer',
        message0: '%1',
        args0: [{ type: 'field_label', name: 'VALUE', text: 'x' }],
      },
    ])
    try {
      // Load a standalone reporter (not connected to a prototype).
      loadXml(`
        <xml>
          <block type="argument_reporter_string_number">
            <field name="VALUE">x</field>
          </block>
        </xml>
      `)

      const reporter = workspace.getAllBlocks(false).find((b) => b.type === 'argument_reporter_string_number')
      assert(reporter, 'Expected argument_reporter_string_number block')

      // The reporter has no prototype parent, so its own handler should run.
      // delegateContextMenuToPrototypeParent captures the original in closure;
      // we verify it falls through by checking getParent() returns null.
      expect(reporter.getParent()).toBeNull()

      // showContextMenu should not throw (calls original handler).
      const mockEvent = new PointerEvent('pointerdown')
      expect(() => reporter.showContextMenu(mockEvent)).not.toThrow()
    } finally {
      delete Blockly.Blocks.argument_reporter_string_number_outer
    }
  })
})
