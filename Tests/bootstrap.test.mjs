import assert from "node:assert/strict";

import { APP_VERSION } from "../Sources/app/defaults.js";
import {
  bootstrapApp,
  buildDestroyableDisposePlan,
  DESTROYABLE_PLAN_ERROR,
  hasValidDestroyableOrder
} from "../Sources/app/bootstrap.js";

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
    "metric-reproducibility-key",
    "metric-lifecycle"
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
    eventLog: [],
    addEventListener(type, listener) {
      this.eventLog.push({ action: "add", type, listener });
    },
    removeEventListener(type, listener) {
      this.eventLog.push({ action: "remove", type, listener });
    },
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
  const cancelledFrames = [];

  globalThis.window = {
    devicePixelRatio: 1,
    innerHeight: 720,
    addEventListener(type, listener) {
      registeredListeners.push({ type, listener });
    },
    removeEventListener(type, listener) {
      registeredListeners.push({ action: "remove", type, listener });
    }
  };

  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = (id) => {
    cancelledFrames.push(id);
  };

  return { registeredListeners, cancelledFrames };
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
  const { registeredListeners: listeners, cancelledFrames } = installWindowStubs();
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
    cancelledFrames,
    rootElement,
    canvasElement,
    documentRef
  };
}

function testBootstrapOverwritesCorruptedStorageWithFallbackState() {
  const { storage, listeners, rootElement, canvasElement, documentRef } = createBootstrapHarness("{invalid json");

  const app = bootstrapApp(documentRef);

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
  assert.equal(typeof app.dispose, "function");
  assert.deepEqual(app.destroyablePlan.map((entry) => entry.category), [
    "bindings",
    "runtime-services",
    "rendering"
  ]);
  assert.deepEqual(app.destroyables.map((entry) => ({
    category: entry.category,
    owner: entry.owner,
    purpose: entry.purpose,
    dependsOn: entry.dependsOn,
    labels: entry.destroyables.map((destroyable) => destroyable.label)
  })), [
    {
      category: "bindings",
      owner: "bootstrap",
      purpose: "Detach store and DOM bindings before subsystem shutdown.",
      dependsOn: [],
      labels: ["store-subscription", "ui-shell"]
    },
    {
      category: "runtime-services",
      owner: "bootstrap",
      purpose: "Stop resize orchestration and simulation work before renderer disposal.",
      dependsOn: ["bindings"],
      labels: ["layout-service", "simulation-loop"]
    },
    {
      category: "rendering",
      owner: "renderer-facade",
      purpose: "Release rendering resources after producers and listeners are stopped.",
      dependsOn: ["runtime-services"],
      labels: ["renderer"]
    }
  ]);
  assert.equal(hasValidDestroyableOrder(app.destroyables), true);
}

function testBootstrapRendersLifecycleNoticeAndMetric() {
  const { rootElement, documentRef } = createBootstrapHarness(undefined);

  bootstrapApp(documentRef, {
    lifecycleMetadata: {
      reinitializeReason: "initial-load",
      reinitializeSequence: 1,
      reinitializedAt: "2026-03-27T00:00:00.000Z"
    }
  });

  assert.equal(
    rootElement.elements.get('[data-role="metric-lifecycle"]').textContent,
    "Restart initial-load #1 @ 2026-03-27T00:00:00.000Z"
  );
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
  const executionNotice = rootElement.elements.get('[data-role="execution-notice"]');

  assert.equal(persisted.appVersion, APP_VERSION);
  assert.equal(
    statusMessage,
    `${MAIN_THREAD_STATUS} ${THREE_FALLBACK_STATUS}`
  );
  assert.equal(executionNotice.textContent, "");
  assert.equal(executionNotice.hidden, true);
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
  const executionNotice = rootElement.elements.get('[data-role="execution-notice"]');

  assert.equal(
    statusMessage,
    `${WORKER_FALLBACK_STATUS} ${THREE_FALLBACK_STATUS}`
  );
  assert.equal(executionNotice.textContent, "");
  assert.equal(executionNotice.hidden, true);
}

function testBootstrapDisposeStopsResizeBindingAndLoop() {
  const { listeners, cancelledFrames, rootElement, documentRef } = createBootstrapHarness(undefined);

  const app = bootstrapApp(documentRef);
  assert.equal(app.runtime.uiShell.rootElement, rootElement);
  app.dispose();
  app.dispose();

  assert.equal(listeners.some((entry) => entry.action === "remove" && entry.type === "resize"), true);
  assert.equal(rootElement.eventLog.some((entry) => entry.action === "add" && entry.type === "click"), true);
  assert.equal(rootElement.eventLog.some((entry) => entry.action === "add" && entry.type === "change"), true);
  assert.equal(rootElement.eventLog.some((entry) => entry.action === "remove" && entry.type === "click"), true);
  assert.equal(rootElement.eventLog.some((entry) => entry.action === "remove" && entry.type === "change"), true);
  assert.deepEqual(cancelledFrames, [1]);
}

function testBootstrapDisposeUsesDeclaredCategoryOrder() {
  const { documentRef } = createBootstrapHarness(undefined);
  const app = bootstrapApp(documentRef);
  const disposeOrder = [];

  for (const category of app.destroyablePlan) {
    for (const destroyable of category.destroyables) {
      destroyable.dispose = () => {
        disposeOrder.push(`${category.category}:${destroyable.label}`);
      };
    }
  }

  app.dispose();

  assert.deepEqual(disposeOrder, [
    "bindings:store-subscription",
    "bindings:ui-shell",
    "runtime-services:layout-service",
    "runtime-services:simulation-loop",
    "rendering:renderer"
  ]);
}

function testDestroyableOrderValidationRejectsDependencyViolations() {
  assert.equal(hasValidDestroyableOrder([
    {
      category: "rendering",
      dependsOn: ["runtime-services"],
      destroyables: []
    },
    {
      category: "runtime-services",
      dependsOn: ["bindings"],
      destroyables: []
    },
    {
      category: "bindings",
      dependsOn: [],
      destroyables: []
    }
  ]), false);
}

function testBuildDestroyableDisposePlanSortsByDependencies() {
  const disposePlan = buildDestroyableDisposePlan([
    {
      category: "rendering",
      dependsOn: ["runtime-services"],
      destroyables: []
    },
    {
      category: "bindings",
      dependsOn: [],
      destroyables: []
    },
    {
      category: "runtime-services",
      dependsOn: ["bindings"],
      destroyables: []
    }
  ]);

  assert.deepEqual(disposePlan.map((category) => category.category), [
    "bindings",
    "runtime-services",
    "rendering"
  ]);
}

function testBuildDestroyableDisposePlanRejectsCycles() {
  let error;

  try {
    buildDestroyableDisposePlan([
      {
        category: "bindings",
        dependsOn: ["rendering"],
        destroyables: []
      },
      {
        category: "rendering",
        dependsOn: ["bindings"],
        destroyables: []
      }
    ]);
  } catch (caughtError) {
    error = caughtError;
  }

  assert.match(error.message, /cyclic dependencies/);
  assert.equal(error.code, DESTROYABLE_PLAN_ERROR.CYCLIC_DEPENDENCY);
}

function testBuildDestroyableDisposePlanRejectsDuplicateCategories() {
  let error;

  try {
    buildDestroyableDisposePlan([
      {
        category: "bindings",
        dependsOn: [],
        destroyables: []
      },
      {
        category: "bindings",
        dependsOn: [],
        destroyables: []
      }
    ]);
  } catch (caughtError) {
    error = caughtError;
  }

  assert.match(error.message, /Duplicate destroyable category/);
  assert.equal(error.code, DESTROYABLE_PLAN_ERROR.DUPLICATE_CATEGORY);
}

function testBuildDestroyableDisposePlanRejectsUnknownDependencies() {
  let error;

  try {
    buildDestroyableDisposePlan([
      {
        category: "bindings",
        dependsOn: ["missing"],
        destroyables: []
      }
    ]);
  } catch (caughtError) {
    error = caughtError;
  }

  assert.match(error.message, /unknown category/);
  assert.equal(error.code, DESTROYABLE_PLAN_ERROR.UNKNOWN_DEPENDENCY);
}

function testBootstrapFailsFastForInvalidDestroyableDefinitions() {
  const { documentRef, listeners, rootElement } = createBootstrapHarness(undefined);
  let error;

  try {
    bootstrapApp(documentRef, {
      destroyablesFactory() {
        return [
          {
            category: "bindings",
            dependsOn: ["missing"],
            destroyables: []
          }
        ];
      }
    });
  } catch (caughtError) {
    error = caughtError;
  }

  assert.match(error.message, /unknown category/);
  assert.equal(error.code, DESTROYABLE_PLAN_ERROR.UNKNOWN_DEPENDENCY);
  assert.equal(listeners.some((entry) => entry.type === "resize"), false);
  assert.equal(rootElement.eventLog.some((entry) => entry.action === "add" && entry.type === "click"), true);
  assert.equal(rootElement.eventLog.some((entry) => entry.action === "remove" && entry.type === "click"), true);
  assert.equal(rootElement.eventLog.some((entry) => entry.action === "remove" && entry.type === "change"), true);
}

testBootstrapOverwritesCorruptedStorageWithFallbackState();
testBootstrapRendersLifecycleNoticeAndMetric();
testBootstrapComposesMigrationStatusAndStagesNormalizedState();
testBootstrapComposesNoSavedStateStatusWithoutRestorePrefix();
testBootstrapComposesWorkerUnavailableFallbackStatus();
testBootstrapDisposeStopsResizeBindingAndLoop();
testBootstrapDisposeUsesDeclaredCategoryOrder();
testDestroyableOrderValidationRejectsDependencyViolations();
testBuildDestroyableDisposePlanSortsByDependencies();
testBuildDestroyableDisposePlanRejectsCycles();
testBuildDestroyableDisposePlanRejectsDuplicateCategories();
testBuildDestroyableDisposePlanRejectsUnknownDependencies();
testBootstrapFailsFastForInvalidDestroyableDefinitions();

console.log("bootstrap.test.mjs ok");