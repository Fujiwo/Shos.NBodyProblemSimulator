export class WindowResizeBinding {
  constructor(resizeTarget, onResize) {
    this.resizeTarget = resizeTarget;
    this.onResize = onResize;
    this.started = false;
    this.handleResize = this.handleResize.bind(this);
  }

  start() {
    if (this.started) {
      return;
    }

    this.started = true;
    this.resizeTarget.addEventListener("resize", this.handleResize);
  }

  stop() {
    if (!this.started) {
      return;
    }

    this.started = false;
    this.resizeTarget.removeEventListener("resize", this.handleResize);
  }

  handleResize() {
    this.onResize?.();
  }
}