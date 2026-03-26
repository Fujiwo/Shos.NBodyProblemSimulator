// Synchronizes viewport sizing, renderer resize, and rerender requests when the available layout changes.

import { applyViewportHeight } from "./viewport-layout.js";

export class LayoutOrchestrator {
  constructor(documentRoot, renderer, onRender) {
    this.documentRoot = documentRoot;
    this.renderer = renderer;
    this.onRender = onRender;
  }

  sync(viewportHeight = window.innerHeight) {
    applyViewportHeight(this.documentRoot, viewportHeight);
    this.renderer.resize();
    this.onRender?.();
  }
}