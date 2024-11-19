/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";
import { Drawer } from "./drawer";
import { RenderInfo } from "./render_info";
import { ConstantProvider } from "./constants";
import { PathObject } from "./path_object";

/**
 * Custom renderer for Scratch-style blocks.
 */
export class ScratchRenderer extends Blockly.zelos.Renderer {
  /**
   * Create a new instance of the renderer's drawer.
   *
   * @param block The block to render.
   * @param infoAn object containing all the information needed to render this
   *     block.
   * @returns The drawer.
   */
  makeDrawer_(block: Blockly.BlockSvg, info: RenderInfo): Drawer {
    return new Drawer(block, info);
  }

  /**
   * Create a new instance of the renderer's render info object.
   *
   * @param block The block to measure.
   * @returns The render info object.
   */
  makeRenderInfo_(block: Blockly.BlockSvg): RenderInfo {
    return new RenderInfo(this, block);
  }

  /**
   * Create a new instance of the renderer's constant provider.
   *
   * @returns The constant provider.
   */
  makeConstants_(): ConstantProvider {
    return new ConstantProvider();
  }

  /**
   * Create a new instance of a renderer path object.
   *
   * @param root The root SVG element.
   * @param style The style object to use for colouring.
   * @returns The renderer path object.
   */
  makePathObject(
    root: SVGElement,
    style: Blockly.Theme.BlockStyle
  ): PathObject {
    return new PathObject(root, style, this.getConstants());
  }

  /**
   * Determine whether or not to highlight a connection.
   *
   * @param connection The connection to determine whether or not to highlight.
   * @returns True if we should highlight the connection.
   */
  shouldHighlightConnection(connection: Blockly.RenderedConnection): boolean {
    return (
      connection.type === Blockly.ConnectionType.INPUT_VALUE &&
      connection.getCheck()?.includes("Boolean")
    );
  }
}

Blockly.blockRendering.register("scratch", ScratchRenderer);
