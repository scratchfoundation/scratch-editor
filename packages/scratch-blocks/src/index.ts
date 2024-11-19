/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";
import "./blocks/colour";
import "./blocks/math";
import "./blocks/matrix";
import "./blocks/note";
import "./blocks/text";
import "./blocks/vertical_extensions";
import "./blocks/control";
import "./blocks/data";
import "./blocks/event";
import "./blocks/looks";
import "./blocks/motion";
import "./blocks/operators";
import "./blocks/procedures";
import "./blocks/sensing";
import "./blocks/sound";
import * as scratchBlocksUtils from "./scratch_blocks_utils";
import * as ScratchVariables from "./variables";
import "./css";
import "./renderer/renderer";
import * as contextMenuItems from "./context_menu_items";
import {
  ContinuousToolbox,
  ContinuousFlyout,
  ContinuousMetrics,
} from "@blockly/continuous-toolbox";
import { CheckableContinuousFlyout } from "./checkable_continuous_flyout.js";
import { buildGlowFilter, glowStack } from "./glows";
import { ScratchContinuousToolbox } from "./scratch_continuous_toolbox";
import "./scratch_comment_icon";
import "./scratch_dragger";
import "./scratch_variable_map";
import "./scratch_variable_model";
import "./scratch_connection_checker";
import "./flyout_checkbox_icon";
import "./events/events_block_comment_change";
import "./events/events_block_comment_collapse";
import "./events/events_block_comment_create";
import "./events/events_block_comment_delete";
import "./events/events_block_comment_move";
import "./events/events_block_comment_resize";
import "./events/events_scratch_variable_create";
import { buildShadowFilter } from "./shadows";
import { registerScratchFieldAngle } from "./fields/scratch_field_angle";
import {
  registerFieldColourSlider,
  FieldColourSlider,
} from "./fields/field_colour_slider";
import { registerScratchFieldDropdown } from "./fields/scratch_field_dropdown";
import { registerFieldMatrix } from "./fields/field_matrix";
import { registerFieldNote, FieldNote } from "./fields/field_note";
import { registerScratchFieldNumber } from "./fields/scratch_field_number";
import { registerFieldTextInputRemovable } from "./fields/field_textinput_removable";
import { registerFieldVariableGetter } from "./fields/field_variable_getter";
import { registerScratchFieldVariable } from "./fields/scratch_field_variable";
import { registerFieldVerticalSeparator } from "./fields/field_vertical_separator";
import { registerRecyclableBlockFlyoutInflater } from "./recyclable_block_flyout_inflater";
import { registerScratchBlockPaster } from "./scratch_block_paster";
import { registerStatusIndicatorLabelFlyoutInflater } from "./status_indicator_label_flyout_inflater";
import { registerScratchContinuousCategory } from "./scratch_continuous_category";

export * from "blockly/core";
export * from "./block_reporting";
export * from "./procedures";
export * from "../msg/scratch_msgs.js";
export * from "./constants";
export { glowStack };
export { scratchBlocksUtils };
export { CheckableContinuousFlyout };
export { ScratchVariables };
export { contextMenuItems };
export { FieldColourSlider, FieldNote };
export { CheckboxBubble } from "./checkbox_bubble";
export {
  StatusIndicatorLabel,
  StatusButtonState,
} from "./status_indicator_label";

export function inject(container: Element, options: Blockly.BlocklyOptions) {
  registerScratchFieldAngle();
  registerFieldColourSlider();
  registerScratchFieldDropdown();
  registerFieldMatrix();
  registerFieldNote();
  registerScratchFieldNumber();
  registerFieldTextInputRemovable();
  registerFieldVariableGetter();
  registerScratchFieldVariable();
  registerFieldVerticalSeparator();
  registerRecyclableBlockFlyoutInflater();
  registerScratchBlockPaster();
  registerStatusIndicatorLabelFlyoutInflater();
  registerScratchContinuousCategory();

  Object.assign(options, {
    renderer: "scratch",
    plugins: {
      toolbox: ScratchContinuousToolbox,
      flyoutsVerticalToolbox: CheckableContinuousFlyout,
      metricsManager: ContinuousMetrics,
    },
  });
  const workspace = Blockly.inject(container, options);

  buildGlowFilter(workspace);
  buildShadowFilter(workspace);

  Blockly.config.dragRadius = 3;
  Blockly.config.snapRadius = 48;
  Blockly.config.connectingSnapRadius = 68;
  Blockly.config.currentConnectionPreference = 20;
  Blockly.config.bumpDelay = 0;

  return workspace;
}

Blockly.Scrollbar.scrollbarThickness = Blockly.Touch.TOUCH_ENABLED ? 14 : 11;
Blockly.FlyoutButton.TEXT_MARGIN_X = 40;
Blockly.FlyoutButton.TEXT_MARGIN_Y = 10;
Blockly.ContextMenuRegistry.registry.unregister("blockDisable");
Blockly.ContextMenuRegistry.registry.unregister("blockInline");
Blockly.ContextMenuItems.registerCommentOptions();
Blockly.ContextMenuRegistry.registry.unregister("blockDelete");
contextMenuItems.registerDeleteBlock();
Blockly.ContextMenuRegistry.registry.unregister("workspaceDelete");
contextMenuItems.registerDeleteAll();
Blockly.comments.CommentView.defaultCommentSize = new Blockly.utils.Size(
  200,
  200
);
