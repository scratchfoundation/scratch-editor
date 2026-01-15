/**
 * @license
 * Copyright 2025 Scratch Foundation
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from "blockly/core";

import { Drawer as ClassicDrawer } from "../drawer";

import { type CatBlockSvg } from "./cat_block_svg";
import { CatPathState, PathCapType, PathEarState, type ConstantProvider } from "./constants";
import { type RenderInfo } from "../render_info";

const Svg = Blockly.utils.Svg;

enum FacePart {
  MOUTH,
  EYE_1_OPEN,
  EYE_2_OPEN,
  EYE_1_CLOSED,
  EYE_2_CLOSED,
  EAR_1_INSIDE,
  EAR_2_INSIDE,
}

const setVisibility = (element: SVGElement, visible: boolean) => {
  if (visible) {
    element.style.removeProperty("visibility");
  } else {
    element.style.setProperty("visibility", "hidden");
  }
};

export class Drawer extends ClassicDrawer {
  face_: SVGElement;
  constants_: ConstantProvider;
  block_: CatBlockSvg;
  pathEarState: CatPathState;

  parts_ = {} as Record<FacePart, SVGElement>;

  constructor(block: CatBlockSvg, info: RenderInfo) {
    super(block, info);
    this.pathEarState = {
      capType: info.isBowlerHatBlock() ? PathCapType.BOWLER : PathCapType.CAP,
      ear1State: PathEarState.UP,
      ear2State: PathEarState.UP,
    };
    if (block.hat && !block.hasFace) {
      this.makeFace(block.getSvgRoot());
      block.hasFace = true;
    }
  }

  override makeReplacementTop_() {
    return this.constants_.makeCatPath(this.info_.width, this.pathEarState);
  }

  override draw() {
    super.draw();
    if (this.face_) {
      const scale = this.info_.RTL ? "scale(-1 1)" : "";
      const translate = `translate(0, ${this.info_.startY})`;
      this.face_.setAttribute("transform", `${scale} ${translate}`);
    }
  }

  redraw() {
    this.outlinePath_ = ""; // `draw` contains a lot of `outlinePath += ...`
    this.draw();
  }

  makeFace(parent: SVGElement) {
    this.buildFaceGeometry_(parent);
    this.setupBlinking_();
    this.setupEarFlicks_();
  }

  setupBlinking_() {
    const blinkDuration = 100;
    let ignoreBlink = false;

    // TODO: Would it be better to use CSS for this?
    Blockly.browserEvents.bind(this.block_.pathObject.svgPath, "mouseenter", this, () => {
      if (ignoreBlink) return;
      ignoreBlink = true;
      setVisibility(this.parts_[FacePart.EYE_1_OPEN], false);
      setVisibility(this.parts_[FacePart.EYE_2_OPEN], false);
      setVisibility(this.parts_[FacePart.EYE_1_CLOSED], true);
      setVisibility(this.parts_[FacePart.EYE_2_CLOSED], true);
      setTimeout(() => {
        setVisibility(this.parts_[FacePart.EYE_1_OPEN], true);
        setVisibility(this.parts_[FacePart.EYE_2_OPEN], true);
        setVisibility(this.parts_[FacePart.EYE_1_CLOSED], false);
        setVisibility(this.parts_[FacePart.EYE_2_CLOSED], false);
      }, blinkDuration);
      setTimeout(() => {
        ignoreBlink = false;
      }, 2 * blinkDuration);
    });
  }

  setupEarFlicks_() {
    const flickDuration = 50;
    let ignoreFlick1 = false;
    let ignoreFlick2 = false;

    Blockly.browserEvents.bind(this.parts_[FacePart.EAR_1_INSIDE], "mouseenter", this, () => {
      if (ignoreFlick1) return;
      ignoreFlick1 = true;
      setVisibility(this.parts_[FacePart.EAR_1_INSIDE], false);
      this.pathEarState.ear1State = PathEarState.DOWN;
      this.redraw();
      setTimeout(() => {
        setVisibility(this.parts_[FacePart.EAR_1_INSIDE], true);
        this.pathEarState.ear1State = PathEarState.UP;
        this.redraw();
      }, flickDuration);
      setTimeout(() => {
        ignoreFlick1 = false;
      }, 2 * flickDuration);
    });
    Blockly.browserEvents.bind(this.parts_[FacePart.EAR_2_INSIDE], "mouseenter", this, () => {
      if (ignoreFlick2) return;
      ignoreFlick2 = true;
      setVisibility(this.parts_[FacePart.EAR_2_INSIDE], false);
      this.pathEarState.ear2State = PathEarState.DOWN;
      this.redraw();
      setTimeout(() => {
        setVisibility(this.parts_[FacePart.EAR_2_INSIDE], true);
        this.pathEarState.ear2State = PathEarState.UP;
        this.redraw();
      }, flickDuration);
      setTimeout(() => {
        ignoreFlick2 = false;
      }, 2 * flickDuration);
    });
  }

  buildFaceGeometry_(parent: SVGElement) {
    const face = Blockly.utils.dom.createSvgElement(
      Svg.G,
      {
        fill: "#000000",
        // transform set in draw()
      },
      parent
    );
    this.face_ = face;

    this.parts_[FacePart.MOUTH] = Blockly.utils.dom.createSvgElement(
      Svg.PATH,
      {
        "fill-opacity": this.constants_.FACE_OPACITY,
        d: this.constants_.MOUTH_PATH,
      },
      face
    );

    this.parts_[FacePart.EAR_1_INSIDE] = Blockly.utils.dom.createSvgElement(
      Svg.PATH,
      {
        fill: this.constants_.EAR_INSIDE_COLOR,
        d: this.constants_.EAR_1_INSIDE_PATH,
      },
      face
    );

    this.parts_[FacePart.EAR_2_INSIDE] = Blockly.utils.dom.createSvgElement(
      Svg.PATH,
      {
        fill: this.constants_.EAR_INSIDE_COLOR,
        d: this.constants_.EAR_2_INSIDE_PATH,
      },
      face
    );

    this.parts_[FacePart.EYE_1_OPEN] = Blockly.utils.dom.createSvgElement(
      Svg.CIRCLE,
      {
        "fill-opacity": this.constants_.FACE_OPACITY,
        cx: this.constants_.EYE_1_X,
        cy: this.constants_.EYE_1_Y,
        r: this.constants_.OPEN_EYE_RADIUS,
      },
      face
    );

    this.parts_[FacePart.EYE_1_CLOSED] = Blockly.utils.dom.createSvgElement(
      Svg.PATH,
      {
        "fill-opacity": this.constants_.FACE_OPACITY,
        d: this.constants_.CLOSED_EYE_1_PATH,
      },
      face
    );
    setVisibility(this.parts_[FacePart.EYE_1_CLOSED], false);

    this.parts_[FacePart.EYE_2_OPEN] = Blockly.utils.dom.createSvgElement(
      Svg.CIRCLE,
      {
        "fill-opacity": this.constants_.FACE_OPACITY,
        cx: this.constants_.EYE_2_X,
        cy: this.constants_.EYE_2_Y,
        r: this.constants_.OPEN_EYE_RADIUS,
      },
      face
    );

    this.parts_[FacePart.EYE_2_CLOSED] = Blockly.utils.dom.createSvgElement(
      Svg.PATH,
      {
        "fill-opacity": this.constants_.FACE_OPACITY,
        d: this.constants_.CLOSED_EYE_2_PATH,
      },
      face
    );
    setVisibility(this.parts_[FacePart.EYE_2_CLOSED], false);
  }
}
