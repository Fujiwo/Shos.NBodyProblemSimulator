import assert from "node:assert/strict";

import { APP_VERSION } from "../Sources/app/defaults.js";
import { bootstrapApp } from "../Sources/app/bootstrap.js";

const MAIN_THREAD_STATUS = "Main-thread simulation backend ready.";
const WORKER_FALLBACK_STATUS = "Worker backend unavailable. Falling back to main-thread simulation.";
const THREE_FALLBACK_STATUS = "Renderer initialized in 2D fallback mode. Texture-backed bodies are unavailable because Three.js failed to initialize (Three.js global is unavailable.).";

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

function createLegacyPersistedState() {
  return JSON.stringify({
    appVersion: "0.2.0-phase2",
    bodyCount: 2,
    bodies: [
      { id: "body-1", name: "Primary", mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" },
      { id: "body-2", name: "Secondary", mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" }
    ],
    simulationConfig: {
      presetId: "binary-orbit",
      timeStep: 0.005,
      softening: 0.01,
      gravitationalConstant: 1,
      integrator: "velocity-verlet",
      maxTrailPoints: 300,
      seed: null
    },
    uiState: {
      selectedBodyId: "body-1",
      cameraTarget: "system-center",
      showTrails: true,
      expandedBodyPanels: ["body-1"]
    },
    committedInitialState: {
      bodyCount: 2,
      bodies: [
        { id: "body-1", name: "Body A", mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" },
        { id: "body-2", name: "Body B", mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" }
      ],
      simulationConfig: {
        presetId: "binary-orbit",
        timeStep: 0.005,
        softening: 0.01,
        gravitationalConstant: 1,
        integrator: "velocity-verlet",
        maxTrailPoints: 300,
        seed: null
      },
      uiState: {
        selectedBodyId: "body-1",
        cameraTarget: "system-center",
        showTrails: true
      }
    },
    playbackRestorePolicy: "restore-as-idle"
  });
}

function createBootstrapHarness(initialStorageValue, options = {}) {
  delete globalThis.THREE;

  if (options.workerClass === undefined) {
    delete globalThis.Worker;
  } else {
    globalThis.Worker = options.workerClass;
  }

  if (options.executionMode === undefined) {
    delete globalThis.__N_BODY_EXECUTION_MODE__;
  } else {
    globalThis.__N_BODY_EXECUTION_MODE__ = options.executionMode;
  }

  const storage = installStorage(initialStorageValue);
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

  return {
    storage,
    listeners,
    rootElement,
    canvasElement,
    documentRef
  };
}

function testBootstrapOverwritesCorruptedStorageWithFallbackState() {
  const { storage, listeners, rootElement, canvasElement, documentRef } = createBootstrapHarness("{invalid json");

  bootstrapApp(documentRef);

  const persisted = JSON.parse(storage.get("nbody-simulator.state"));
  const statusMessage = rootElement.elements.get('[data-role="status-message"]').textContent;

  assert.equal(persisted.appVersion, APP_VERSION);
  assert.equal(persisted.uiState.playbackState, undefined);
  assert.equal(persisted.playbackRestorePolicy, "restore-as-idle");
  assert.equal(persisted.simulationConfig.seed, 1001);
  assert.equal(
    statusMessage,
    `Failed to restore saved state. Defaults were applied. ${MAIN_THREAD_STATUS} ${THREE_FALLBACK_STATUS}`
  );
  assert.equal(listeners.some((entry) => entry.type === "resize"), true);
  assert.equal(canvasElement.width, 640);
  assert.equal(canvasElement.height, 360);
}

function testBootstrapComposesMigrationStatusAndStagesNormalizedState() {
  const { storage, rootElement, documentRef } = createBootstrapHarness(createLegacyPersistedState());

  bootstrapApp(documentRef);

  const persisted = JSON.parse(storage.get("nbody-simulator.state"));
  const statusMessage = rootElement.elements.get('[data-role="status-message"]').textContent;

  assert.equal(persisted.appVersion, APP_VERSION);
  assert.deepEqual(persisted.bodies.map((body) => body.name), ["sun", "mercury"]);
  assert.deepEqual(persisted.committedInitialState.bodies.map((body) => body.name), ["sun", "mercury"]);
  assert.equal(
    statusMessage,
    `Saved state restored after migration from 0.2.0-phase2. ${MAIN_THREAD_STATUS} ${THREE_FALLBACK_STATUS}`
  );
}

function testBootstrapComposesNoSavedStateStatusWithoutRestorePrefix() {
  const { storage, rootElement, documentRef } = createBootstrapHarness(undefined);

  bootstrapApp(documentRef);

  const persisted = JSON.parse(storage.get("nbody-simulator.state"));
  const statusMessage = rootElement.elements.get('[data-role="status-message"]').textContent;

  assert.equal(persisted.appVersion, APP_VERSION);
  assert.equal(
    statusMessage,
    `${MAIN_THREAD_STATUS} ${THREE_FALLBACK_STATUS}`
  );
}

function testBootstrapComposesWorkerUnavailableFallbackStatus() {
  class ThrowingWorker {
    constructor() {
      throw new Error("worker unavailable");
    }
  }

  const { rootElement, documentRef } = createBootstrapHarness(undefined, {
    executionMode: "worker",
    workerClass: ThrowingWorker
  });

  bootstrapApp(documentRef);

  const statusMessage = rootElement.elements.get('[data-role="status-message"]').textContent;

  assert.equal(
    statusMessage,
    `${WORKER_FALLBACK_STATUS} ${THREE_FALLBACK_STATUS}`
  );
}

testBootstrapOverwritesCorruptedStorageWithFallbackState();
testBootstrapComposesMigrationStatusAndStagesNormalizedState();
testBootstrapComposesNoSavedStateStatusWithoutRestorePrefix();
testBootstrapComposesWorkerUnavailableFallbackStatus();

console.log("bootstrap.test.mjs ok");