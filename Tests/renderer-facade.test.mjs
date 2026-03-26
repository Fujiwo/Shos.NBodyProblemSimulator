import assert from "node:assert/strict";

import { RendererFacade } from "../Sources/app/renderer-facade.js";

class SceneStub {
  add() {}
  remove() {}
}

class PerspectiveCameraStub {
  constructor() {
    this.position = { set() {}, x: 0, y: 0, z: 0 };
    this.aspect = 1;
  }

  lookAt() {}
  updateProjectionMatrix() {}
}

class ThrowingRendererStub {
  constructor() {
    throw new Error("WebGL unavailable in test.");
  }
}

function createFailingThreeStub() {
  return {
    Scene: SceneStub,
    Fog: class FogStub {},
    PerspectiveCamera: PerspectiveCameraStub,
    WebGLRenderer: ThrowingRendererStub,
    TextureLoader: class TextureLoaderStub {},
    AmbientLight: class AmbientLightStub { constructor() { this.position = { set() {} }; } },
    DirectionalLight: class DirectionalLightStub { constructor() { this.position = { set() {} }; } },
    GridHelper: class GridHelperStub { constructor() { this.position = { y: 0 }; } },
    AxesHelper: class AxesHelperStub { constructor() { this.position = { set() {} }; } },
    SRGBColorSpace: "srgb"
  };
}

function createCanvasAndContext(width = 640, height = 360) {
  const drawCalls = [];
  const gradient = { addColorStop() {} };
  const context = {
    fillStyle: null,
    strokeStyle: null,
    lineWidth: 0,
    shadowBlur: 0,
    shadowColor: null,
    font: "",
    clearRect() { drawCalls.push("clearRect"); },
    fillRect() { drawCalls.push("fillRect"); },
    save() { drawCalls.push("save"); },
    restore() { drawCalls.push("restore"); },
    beginPath() { drawCalls.push("beginPath"); },
    arc() { drawCalls.push("arc"); },
    fill() { drawCalls.push("fill"); },
    stroke() { drawCalls.push("stroke"); },
    moveTo() { drawCalls.push("moveTo"); },
    lineTo() { drawCalls.push("lineTo"); },
    createLinearGradient() { return gradient; },
    fillText(text) { drawCalls.push(`fillText:${text}`); }
  };
  const canvas = {
    width: 0,
    height: 0,
    getBoundingClientRect() {
      return { width, height };
    },
    getContext(kind) {
      assert.equal(kind, "2d");
      return context;
    }
  };

  return { canvas, drawCalls };
}

function createModel() {
  return {
    appState: {
      bodies: [
        {
          id: "body-1",
          name: "earth",
          mass: 1,
          position: { x: 1, y: 2, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          color: "#3366ff"
        }
      ],
      simulationConfig: {
        maxTrailPoints: 10
      },
      uiState: {
        showTrails: true
      }
    },
    runtime: {
      simulationTime: 1
    }
  };
}

function testRendererFacadeFallsBackTo2dWhenThreeRendererFails() {
  globalThis.THREE = createFailingThreeStub();
  globalThis.window = { devicePixelRatio: 1 };

  const { canvas, drawCalls } = createCanvasAndContext();
  const facade = new RendererFacade(canvas);

  facade.resize();
  facade.render(createModel());

  assert.equal(facade.getModeLabel(), "2D fallback mode");
  assert.ok(drawCalls.includes("clearRect"));
  assert.ok(drawCalls.includes("fillRect"));
  assert.ok(drawCalls.includes("fillText:2D fallback mode"));
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
}

testRendererFacadeFallsBackTo2dWhenThreeRendererFails();

console.log("renderer-facade.test.mjs ok");