import { ThreeSceneHost } from "./three-scene-host.js";
import { renderFallbackScene } from "./renderer-fallback.js";
import { createFallbackTrailHistory, reduceFallbackTrailHistory } from "./renderer-fallback-state.js";
import { measureCanvasBufferSize } from "./viewport-layout.js";

export class RendererFacade {
  constructor(canvasElement, options = {}) {
    const { three = globalThis.THREE } = options;
    this.canvasElement = canvasElement;
    this.pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    this.latestModel = null;
    this.trailHistory = createFallbackTrailHistory();
    this.threeSceneHost = new ThreeSceneHost(canvasElement, {
      three,
      onInvalidate: () => {
        if (this.latestModel) {
          this.render(this.latestModel);
        }
      }
    });
    this.context = this.threeSceneHost.ready ? null : canvasElement.getContext("2d");
  }

  getModeLabel() {
    return this.threeSceneHost.getModeLabel();
  }

  getInitializationStatus() {
    return this.threeSceneHost.getInitializationStatus();
  }

  resize() {
    const { width, height } = measureCanvasBufferSize(this.canvasElement, this.pixelRatio);

    if (this.canvasElement.width !== width || this.canvasElement.height !== height) {
      this.canvasElement.width = width;
      this.canvasElement.height = height;
    }

    this.threeSceneHost.resize();
  }

  resetTrailHistory() {
    this.trailHistory = createFallbackTrailHistory();
  }

  syncTrailHistory(model) {
    this.trailHistory = reduceFallbackTrailHistory(this.trailHistory, model);
  }

  dispose() {
    this.resetTrailHistory();
    this.threeSceneHost.dispose();
  }

  render(model) {
    this.latestModel = model;

    if (this.threeSceneHost.render(model)) {
      return;
    }

    if (!this.context) {
      return;
    }

    this.syncTrailHistory(model);

    renderFallbackScene({
      context: this.context,
      width: this.canvasElement.width,
      height: this.canvasElement.height,
      bodies: model.appState.bodies,
      trailHistory: this.trailHistory,
      pixelRatio: this.pixelRatio,
      showTrails: model.appState.uiState.showTrails,
      modeLabel: this.getModeLabel()
    });
  }
}