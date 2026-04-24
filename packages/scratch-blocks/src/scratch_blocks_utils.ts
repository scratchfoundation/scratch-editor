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
 * Return a new serialized block state object with `id` properties removed
 * from this block and recursively from nested `inputs`/`next` block and
 * shadow states so they get fresh IDs when deserialized onto the workspace.
 * The input state is NOT modified. Blockly's serialization shares shadow
 * state objects by reference with the live workspace, so mutating the
 * serialized tree in place would corrupt the original block's internal
 * shadow state.
 * @param state A serialized block state object.
 * @returns A new state object with `id` properties removed from serialized
 *     block/shadow subtrees.
 */
export function stripIds(state: Blockly.serialization.blocks.State): Blockly.serialization.blocks.State {
  const copy: Blockly.serialization.blocks.State = { ...state }
  delete copy.id
  if (copy.inputs) {
    const inputs: typeof copy.inputs = {}
    for (const inputName in copy.inputs) {
      const conn = copy.inputs[inputName]
      inputs[inputName] = {
        ...(conn.shadow && { shadow: stripIds(conn.shadow) }),
        ...(conn.block && { block: stripIds(conn.block) }),
      }
    }
    copy.inputs = inputs
  }
  if (copy.next) {
    copy.next = {
      ...(copy.next.shadow && { shadow: stripIds(copy.next.shadow) }),
      ...(copy.next.block && { block: stripIds(copy.next.block) }),
    }
  }
  return copy
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
