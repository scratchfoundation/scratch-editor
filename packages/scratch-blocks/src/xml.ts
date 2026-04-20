/**
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Blockly from 'blockly/core'
import { ScratchVariableModel } from './scratch_variable_model'

// Blockly's blockToDom has a bug where the `empty` flag for an input's
// container element is only set to false when a non-shadow target block
// exists. If a connection has shadow DOM but no target block (which can
// happen transiently during connect/disconnect operations or if shadow
// respawn fails), the shadow clone IS appended to the <value> container
// but the container is never appended to the output because `empty`
// stays true. This causes the input to silently disappear from the XML,
// which corrupts the VM's block representation on the next save/load.
//
// We fix this by wrapping blockToDom: after the original runs, we check
// each value/statement input. If the connection has shadow state but the
// output XML is missing the corresponding <value>/<statement> element,
// we serialize the shadow ourselves and inject it.
const originalBlockToDom = Blockly.Xml.blockToDom.bind(Blockly.Xml)

Blockly.Xml.blockToDom = function blockToDomFixed(
  block: Blockly.Block,
  opt_noId?: boolean,
): Element | DocumentFragment {
  const result = originalBlockToDom(block, opt_noId)
  if (!(result instanceof Element)) return result

  for (const input of block.inputList) {
    if (!input.connection) continue

    const name = input.name
    // Check if this input already appears in the serialized XML.
    // Use localName for case-insensitive comparison across DOM implementations.
    const alreadySerialized = Array.from(result.children).some((child) => {
      const tag = child.localName
      return (tag === 'value' || tag === 'statement') && child.getAttribute('name') === name
    })
    if (alreadySerialized) continue

    // The input is missing from the XML. Check if there's shadow state
    // that should have been included.
    if (!input.connection.getShadowState()) continue

    // If shadow DOM is still available on the connection, clone that DOM
    // into a new container and append it to the serialized output.
    const existingShadowDom = input.connection.getShadowDom()
    if (existingShadowDom) {
      const tagName = input.type === Blockly.inputs.inputTypes.VALUE ? 'value' : 'statement'
      const doc = result.ownerDocument
      const container = doc.createElementNS(result.namespaceURI, tagName)
      container.setAttribute('name', name)
      container.appendChild(doc.importNode(existingShadowDom, true))
      if (opt_noId) {
        for (const shadowEl of container.querySelectorAll('shadow')) {
          shadowEl.removeAttribute('id')
        }
      }
      result.appendChild(container)
      console.warn(
        `[scratch-blocks] blockToDom fix: recovered missing input "${name}" on ${block.type} (${block.id})`,
      )
    }
  }

  return result
}

/**
 * Clears the workspace and loads the given serialized state.
 * @param xml XML representation of a Blockly workspace.
 * @param workspace The workspace to load the serialized data onto.
 * @returns An array of variable IDs created during loading.
 */
export function clearWorkspaceAndLoadFromXml(xml: Element, workspace: Blockly.WorkspaceSvg): string[] {
  workspace.setResizesEnabled(false)
  Blockly.Events.setGroup(true)
  workspace.clear()

  // Manually load variables to include the cloud and local properties that core
  // Blockly is unaware of.
  for (const variable of xml.querySelectorAll('variables variable')) {
    const id = variable.getAttribute('id')
    if (!id) continue
    const type = variable.getAttribute('type') ?? ''
    const name = variable.textContent
    const isLocal = variable.getAttribute('islocal') === 'true'
    const isCloud = variable.getAttribute('iscloud') === 'true'

    const variableModel = new ScratchVariableModel(workspace, name, type, id, isLocal, isCloud)
    Blockly.Events.fire(new (Blockly.Events.get(Blockly.Events.VAR_CREATE))(variableModel))
    workspace.getVariableMap().addVariable(variableModel)
  }

  // Remove the `variables` element from the XML to prevent Blockly from
  // throwing or stomping on the variables we created.
  xml.querySelector('variables')?.remove()

  // Defer to core for the rest of the deserialization.
  let blockIds: string[]
  try {
    blockIds = Blockly.Xml.domToWorkspace(xml, workspace)
  } catch (error) {
    const context =
      Array.from(xml.children)
        .map((el) => {
          const type = el.getAttribute('type')
          const id = el.getAttribute('id')
          const attrs = [...(type ? [`type=${type}`] : []), ...(id ? [`id=${id}`] : [])]
          return attrs.length ? `${el.tagName}[${attrs.join(', ')}]` : el.tagName
        })
        .join(', ') || '(none)'
    const message = error instanceof Error ? error.message : String(error)
    const wrapped = new Error(
      `Failed to load workspace XML (${message}). Top-level elements: ${context}`,
    ) as Error & { cause?: unknown }
    wrapped.cause = error
    throw wrapped
  } finally {
    Blockly.Events.setGroup(false)
    workspace.setResizesEnabled(true)
  }

  return blockIds
}
