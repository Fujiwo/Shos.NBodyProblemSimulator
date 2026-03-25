import { ThreeSceneHost } from "./three-scene-host.js";

export class RendererFacade {
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
    this.pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    this.latestModel = null;
    this.threeSceneHost = new ThreeSceneHost(canvasElement, {
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

  resize() {
    const bounds = this.canvasElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width * this.pixelRatio));
    const height = Math.max(1, Math.floor(bounds.height * this.pixelRatio));

    if (this.canvasElement.width !== width || this.canvasElement.height !== height) {
      this.canvasElement.width = width;
      this.canvasElement.height = height;
    }

    this.threeSceneHost.resize();
  }

  render(model) {
    this.latestModel = model;

    if (this.threeSceneHost.render(model)) {
      return;
    }

    if (!this.context) {
      return;
    }

    const { width, height } = this.canvasElement;
    const context = this.context;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.18;

    context.clearRect(0, 0, width, height);

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "rgba(24, 55, 82, 0.95)");
    background.addColorStop(1, "rgba(6, 14, 24, 0.98)");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.save();
    context.strokeStyle = "rgba(255, 255, 255, 0.1)";
    context.lineWidth = 1;

    for (let step = 1; step <= 4; step += 1) {
      context.beginPath();
      context.arc(centerX, centerY, scale * step * 0.95, 0, Math.PI * 2);
      context.stroke();
    }

    context.restore();

    for (const body of model.appState.bodies) {
      const x = centerX + body.position.x * scale;
      const y = centerY - body.position.y * scale;
      const radius = Math.max(5 * this.pixelRatio, Math.sqrt(body.mass) * 6 * this.pixelRatio);

      context.save();
      context.fillStyle = body.color;
      context.shadowBlur = 24 * this.pixelRatio;
      context.shadowColor = body.color;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    context.save();
    context.fillStyle = "rgba(255, 255, 255, 0.76)";
    context.font = `${14 * this.pixelRatio}px Segoe UI`;
    context.fillText(this.getModeLabel(), 16 * this.pixelRatio, 28 * this.pixelRatio);
    context.restore();
  }
}