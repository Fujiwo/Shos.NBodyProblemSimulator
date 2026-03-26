import assert from "node:assert/strict";

import { APP_VERSION } from "../Sources/app/defaults.js";
import { bootstrapApp } from "../Sources/app/bootstrap.js";

function createElementStub() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    checked: false,
    disabled: false,
    hidden: false,
    placeholder: "",
    dataset: {},
    style: {},
    classList: {
      toggle() {}
    }
  };
}

function createCanvasContextStub() {
  return {
    fillStyle: null,
    strokeStyle: null,
    lineWidth: 0,
    shadowBlur: 0,
    shadowColor: null,
    font: "",
    clearRect() {},
    fillRect() {},
    save() {},
    restore() {},
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    fillText() {},
    createLinearGradient() {
      return {
        addColorStop() {}
      };
    }
  };
}

function createRootStub() {
  const selectors = new Map();
  const dataRoles = [
    "playback-state",
    "status-message",
    "execution-notice",
    "body-count",
    "preset-id",
    "seed",
    "time-step",
    "softening",
    "integrator",
    "camera-target",
    "show-trails",
    "body-card-list",
    "validation-panel",
    "validation-list",
    "metric-fps",
    "metric-simulation-time",
    "metric-energy-error",
    "metric-pipeline-time",
    "metric-integrator",
    "metric-active-preset",
    "metric-current-seed",
    "metric-body-count",
    "metric-reproducibility-key"
  ];

  for (const role of dataRoles) {
    selectors.set(`[data-role="${role}"]`, createElementStub());
  }

  for (const key of ["bodyCount", "seed", "timeStep", "softening", "integrator"]) {
    selectors.set(`[data-field-wrapper="${key}"]`, createElementStub());
    selectors.set(`[data-field-error="${key}"]`, createElementStub());
  }

  for (const action of ["generate", "start", "pause", "resume", "reset"]) {
    selectors.set(`[data-action="${action}"]`, createElementStub());
  }

  return {
    addEventListener() {},
    querySelector(selector) {
      return selectors.get(selector) ?? null;
    },
    elements: selectors
  };
}

function createCanvasStub(width = 640, height = 360) {
  const context = createCanvasContextStub();

  return {
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
}

function installStorage(initialValue) {
  const storage = new Map();

  if (initialValue !== undefined) {
    storage.set("nbody-simulator.state", initialValue);
  }

  globalThis.localStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, value);
    }
  };

  return storage;
}

function installWindowStubs() {
  const registeredListeners = [];

  globalThis.window = {
    devicePixelRatio: 1,
    innerHeight: 720,
    addEventListener(type, listener) {
      registeredListeners.push({ type, listener });
    }
  };

  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};

  return registeredListeners;
}

function testBootstrapOverwritesCorruptedStorageWithFallbackState() {
  delete globalThis.THREE;
  delete globalThis.Worker;

  const storage = installStorage("{invalid json");
  const listeners = installWindowStubs();
  const rootElement = createRootStub();
  const canvasElement = createCanvasStub();
  const documentRef = {
    documentElement: {
      style: {
        setProperty() {}
      }
    },
    location: {
      href: "http://localhost/"
    },
    querySelector(selector) {
      if (selector === '[data-role="app-root"]') {
        return rootElement;
      }

      if (selector === '[data-role="viewport-canvas"]') {
        return canvasElement;
      }

      return null;
    }
  };

  bootstrapApp(documentRef);

  const persisted = JSON.parse(storage.get("nbody-simulator.state"));
  const statusMessage = rootElement.elements.get('[data-role="status-message"]').textContent;

  assert.equal(persisted.appVersion, APP_VERSION);
  assert.equal(persisted.uiState.playbackState, undefined);
  assert.equal(persisted.playbackRestorePolicy, "restore-as-idle");
  assert.equal(persisted.simulationConfig.seed, 1001);
  assert.ok(statusMessage.includes("Failed to restore saved state. Defaults were applied."));
  assert.ok(statusMessage.includes("Main-thread simulation backend ready."));
  assert.ok(statusMessage.includes("Renderer initialized in 2D fallback mode."));
  assert.equal(listeners.some((entry) => entry.type === "resize"), true);
  assert.equal(canvasElement.width, 640);
  assert.equal(canvasElement.height, 360);
}

testBootstrapOverwritesCorruptedStorageWithFallbackState();

console.log("bootstrap.test.mjs ok");