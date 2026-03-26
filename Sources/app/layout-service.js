import { applyViewportHeight } from "./viewport-layout.js";

export class LayoutService {
  constructor(documentRoot, renderer, onRender) {
    this.documentRoot = documentRoot;
    this.renderer = renderer;
    this.onRender = onRender;
    this.handleResize = this.handleResize.bind(this);
  }

  start() {
    this.handleResize();
    window.addEventListener("resize", this.handleResize);
  }

  handleResize() {
    applyViewportHeight(this.documentRoot, window.innerHeight);
    this.renderer.resize();
    this.onRender?.();
  }
}