import * as Blockly from 'blockly/core'

export function getRequiredMainWorkspaceSvg(): Blockly.WorkspaceSvg {
  const mainWorkspace = Blockly.getMainWorkspace()
  if (!(mainWorkspace instanceof Blockly.WorkspaceSvg)) {
    throw new Error('Expected main workspace to be a WorkspaceSvg')
  }
  return mainWorkspace
}

export function getBlockSvgById(workspace: Blockly.WorkspaceSvg, id: string): Blockly.BlockSvg | null {
  const block = workspace.getBlockById(id)
  return block instanceof Blockly.BlockSvg ? block : null
}
