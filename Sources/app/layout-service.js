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
    this.documentRoot.style.setProperty("--app-height", `${window.innerHeight}px`);
    this.renderer.resize();
    this.onRender?.();
  }
}