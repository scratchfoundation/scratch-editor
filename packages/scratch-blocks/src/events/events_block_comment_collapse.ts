/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";
import {
  BlockCommentBase,
  BlockCommentBaseJson,
} from "./events_block_comment_base";
import type { ScratchCommentBubble } from "../scratch_comment_bubble";

class BlockCommentCollapse extends BlockCommentBase {
  newCollapsed: boolean;

  constructor(opt_blockComment?: ScratchCommentBubble, collapsed?: boolean) {
    super(opt_blockComment);
    this.type = "block_comment_collapse";
    this.newCollapsed = collapsed;
  }

  toJson(): BlockCommentCollapseJson {
    return {
      ...super.toJson(),
      collapsed: this.newCollapsed,
    };
  }

  static fromJson(
    json: BlockCommentCollapseJson,
    workspace: Blockly.Workspace,
    event?: any
  ): BlockCommentCollapse {
    const newEvent = super.fromJson(
      json,
      workspace,
      event ?? new BlockCommentCollapse()
    ) as BlockCommentCollapse;
    newEvent.newCollapsed = json["collapsed"];

    return newEvent;
  }

  run(forward: boolean) {
    const workspace = this.getEventWorkspace_();
    const block = workspace.getBlockById(this.blockId);
    const comment = block.getIcon(Blockly.icons.IconType.COMMENT);
    comment.setBubbleVisible(forward ? !this.newCollapsed : this.newCollapsed);
  }
}

interface BlockCommentCollapseJson extends BlockCommentBaseJson {
  collapsed: boolean;
}

Blockly.registry.register(
  Blockly.registry.Type.EVENT,
  "block_comment_collapse",
  BlockCommentCollapse
);
