/**
 * Visual Blocks Editor
 *
 * Copyright 2018 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @file Utility methods for Scratch Blocks but not Blockly.
 * @author fenichel@google.com (Rachel Fenichel)
 */
import type * as Blockly from 'blockly/core'

/**
 * Recursively strip `id` properties from a serialized block state tree
 * so that every block (including shadows and nested inputs) gets a fresh
 * ID when deserialized onto the workspace. This prevents two blocks from
 * sharing the same shadow block in the VM, which would cause deleting
 * one to destroy the other's shadow.
 * @param state A serialized block state object.
 */
export function stripIds(state: Blockly.serialization.blocks.State): void {
  delete state.id
  if (state.inputs) {
    for (const inputName in state.inputs) {
      const conn = state.inputs[inputName]
      if (conn.shadow) stripIds(conn.shadow)
      if (conn.block) stripIds(conn.block)
    }
  }
  if (state.next) {
    if (state.next.shadow) stripIds(state.next.shadow)
    if (state.next.block) stripIds(state.next.block)
  }
}

/**
 * Compare strings with natural number sorting.
 * @param str1 First input.
 * @param str2 Second input.
 * @returns -1, 0, or 1 to signify greater than, equality, or less than.
 */
export function compareStrings(str1: string, str2: string): number {
  return str1.localeCompare(str2, [], {
    sensitivity: 'base',
    numeric: true,
  })
}
