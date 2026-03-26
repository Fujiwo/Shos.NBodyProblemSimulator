import assert from "node:assert/strict";

import { AppStore } from "../Sources/app/app-store.js";
import { createInitialModel } from "../Sources/app/defaults.js";
import { SimulationController } from "../Sources/app/simulation-controller.js";

function createControllerHarness() {
  const store = new AppStore(createInitialModel());
  const persistenceCalls = [];
  const loopCalls = [];
  const controller = new SimulationController(store, {
    stage(appState) {
      persistenceCalls.push(appState.uiState.playbackState);
    }
  });

  controller.attachLoop({
    prepareForStart() {
      loopCalls.push("start");
    },
    prepareForPause() {
      loopCalls.push("pause");
    },
    prepareForResume() {
      loopCalls.push("resume");
    },
    reset() {
      loopCalls.push("reset");
    }
  });

  return { store, controller, persistenceCalls, loopCalls };
}

function testTransitionGuards() {
  const { store, controller, loopCalls } = createControllerHarness();

  controller.refreshValidation();
  controller.start();
  controller.start();
  controller.pause();
  controller.start();
  controller.resume();
  controller.reset();

  const state = store.getState();

  assert.equal(state.appState.uiState.playbackState, "idle");
  assert.equal(state.runtime.simulationTime, 0);
  assert.deepEqual(loopCalls, ["start", "pause", "resume", "reset"]);
}

function testCameraTargetNormalization() {
  const { store, controller } = createControllerHarness();

  controller.updateSelectedBody("body-2");
  controller.updateCameraTarget("body-2");
  controller.updateCameraTarget("missing-body");

  const state = store.getState();

  assert.equal(state.appState.uiState.selectedBodyId, "body-2");
  assert.equal(state.appState.uiState.cameraTarget, "system-center");
}

function testGenerateResetsRuntimeAndCommitsState() {
  const { store, controller } = createControllerHarness();

  controller.refreshValidation();
  controller.updateSimulationConfig("presetId", "binary-orbit");
  controller.updateSimulationConfig("integrator", "rk4");
  controller.generate();

  const state = store.getState();

  assert.equal(state.appState.uiState.playbackState, "idle");
  assert.equal(state.runtime.simulationTime, 0);
  assert.equal(state.appState.bodyCount, 2);
  assert.equal(state.appState.simulationConfig.integrator, "rk4");
  assert.deepEqual(
    state.appState.committedInitialState.bodies.map((body) => body.name),
    state.appState.bodies.map((body) => body.name)
  );
  assert.deepEqual(state.appState.uiState.expandedBodyPanels, ["body-1"]);
}

function testBodyPanelStateSupportsIndependentOpenAndClose() {
  const { store, controller } = createControllerHarness();

  controller.toggleBodyPanel("body-2", true);

  let state = store.getState();
  assert.deepEqual(state.appState.uiState.expandedBodyPanels, ["body-1", "body-2"]);

  controller.toggleBodyPanel("body-3", true);

  state = store.getState();
  assert.deepEqual(state.appState.uiState.expandedBodyPanels, ["body-1", "body-2", "body-3"]);

  controller.toggleBodyPanel("body-1", false);

  state = store.getState();
  assert.deepEqual(state.appState.uiState.expandedBodyPanels, ["body-2", "body-3"]);

  controller.toggleBodyPanel("body-2", false);
  controller.toggleBodyPanel("body-3", false);

  state = store.getState();
  assert.deepEqual(state.appState.uiState.expandedBodyPanels, []);
}

function testStartRejectsValidationErrorsAndSetsStatusMessage() {
  const { store, controller, loopCalls } = createControllerHarness();

  controller.updateSimulationConfig("timeStep", "0");
  controller.start();

  const state = store.getState();

  assert.equal(state.appState.uiState.playbackState, "idle");
  assert.equal(state.runtime.statusMessage, "Resolve validation issues before starting the simulation.");
  assert.ok(state.runtime.validationErrors.includes("Time Step must be greater than 0."));
  assert.deepEqual(loopCalls, []);
}

function testStartRejectsWhileRunningAndSetsStatusMessage() {
  const { store, controller, loopCalls } = createControllerHarness();

  controller.refreshValidation();
  controller.start();
  controller.start();

  const state = store.getState();

  assert.equal(state.appState.uiState.playbackState, "running");
  assert.equal(state.runtime.statusMessage, "Simulation is already running. Pause or Reset before starting again.");
  assert.deepEqual(loopCalls, ["start"]);
}

function testStartRejectsWhilePausedAndSetsStatusMessage() {
  const { store, controller, loopCalls } = createControllerHarness();

  controller.refreshValidation();
  controller.start();
  controller.pause();
  controller.start();

  const state = store.getState();

  assert.equal(state.appState.uiState.playbackState, "paused");
  assert.equal(state.runtime.statusMessage, "Use Resume to continue or Reset to restart from the committed initial state.");
  assert.deepEqual(loopCalls, ["start", "pause"]);
}

function testGenerateUsesAutoSeedWhenRandomClusterSeedDraftIsBlank() {
  const { store, controller, loopCalls } = createControllerHarness();
  const originalNow = Date.now;

  Date.now = () => 1234567890;

  try {
    controller.updateSimulationConfig("seed", "");

    let state = store.getState();
    assert.equal(state.runtime.fieldDrafts.seed, "");
    assert.equal(state.runtime.fieldErrors.seed, undefined);

    controller.generate();

    state = store.getState();
    assert.equal(state.appState.simulationConfig.seed, 1234567890);
    assert.deepEqual(state.runtime.fieldDrafts, {});
    assert.equal(state.runtime.statusMessage, "Random cluster generated with seed 1234567890.");
    assert.deepEqual(loopCalls, ["reset"]);
  } finally {
    Date.now = originalNow;
  }
}

function testGenerateRejectsInvalidRandomClusterSeedDraft() {
  const { store, controller, loopCalls } = createControllerHarness();
  const beforeState = store.getState();
  const beforeSeed = beforeState.appState.simulationConfig.seed;
  const beforeBodyNames = beforeState.appState.bodies.map((body) => body.name);

  controller.updateSimulationConfig("seed", "not-a-number");
  controller.generate();

  const state = store.getState();

  assert.equal(state.appState.simulationConfig.seed, beforeSeed);
  assert.deepEqual(state.appState.bodies.map((body) => body.name), beforeBodyNames);
  assert.equal(state.runtime.fieldDrafts.seed, "not-a-number");
  assert.equal(state.runtime.fieldErrors.seed, "Seed must be a 32-bit unsigned integer for random-cluster.");
  assert.equal(state.runtime.statusMessage, "Resolve the Seed field before generating random-cluster.");
  assert.deepEqual(loopCalls, []);
}

function testResetRestoresLatestCommittedGeneratedSnapshot() {
  const { store, controller, loopCalls } = createControllerHarness();
  const originalNow = Date.now;

  Date.now = () => 1234567890;

  try {
    controller.updateSimulationConfig("seed", "");
    controller.generate();
  } finally {
    Date.now = originalNow;
  }

  const committedSnapshot = store.getState().appState.committedInitialState;

  store.update((model) => {
    model.appState.uiState.playbackState = "running";
    model.appState.bodies[0].position.x = 999;
    model.appState.simulationConfig.seed = 7;
    model.runtime.simulationTime = 12.5;
    model.runtime.fieldDrafts.seed = "invalid";
  });

  controller.reset();

  const state = store.getState();

  assert.equal(state.appState.uiState.playbackState, "idle");
  assert.deepEqual(state.appState.bodies, committedSnapshot.bodies);
  assert.deepEqual(state.appState.simulationConfig, committedSnapshot.simulationConfig);
  assert.equal(state.appState.simulationConfig.seed, 1234567890);
  assert.equal(state.runtime.simulationTime, 0);
  assert.deepEqual(state.runtime.fieldDrafts, {});
  assert.equal(state.runtime.statusMessage, "Reset restored the committed initial state.");
  assert.deepEqual(state.appState.uiState.expandedBodyPanels, ["body-1"]);
  assert.deepEqual(loopCalls, ["reset", "reset"]);
}

testTransitionGuards();
testCameraTargetNormalization();
testGenerateResetsRuntimeAndCommitsState();
testBodyPanelStateSupportsIndependentOpenAndClose();
testStartRejectsValidationErrorsAndSetsStatusMessage();
testStartRejectsWhileRunningAndSetsStatusMessage();
testStartRejectsWhilePausedAndSetsStatusMessage();
testGenerateUsesAutoSeedWhenRandomClusterSeedDraftIsBlank();
testGenerateRejectsInvalidRandomClusterSeedDraft();
testResetRestoresLatestCommittedGeneratedSnapshot();

console.log("simulation-controller.test.mjs ok");