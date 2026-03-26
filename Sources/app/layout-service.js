import { LayoutOrchestrator } from "./layout-orchestrator.js";
import { WindowResizeBinding } from "./window-resize-binding.js";

export class LayoutService {
  constructor(documentRoot, renderer, onRender, options = {}) {
    const resizeTarget = options.resizeTarget ?? window;
    this.orchestrator = new LayoutOrchestrator(documentRoot, renderer, onRender);
    this.resizeBinding = new WindowResizeBinding(resizeTarget, () => {
      this.orchestrator.sync();
    });
    this.handleResize = this.handleResize.bind(this);
  }

  start() {
    this.orchestrator.sync();
    this.resizeBinding.start();
  }

  stop() {
    this.resizeBinding.stop();
  }

  handleResize() {
    this.orchestrator.sync();
  }
}