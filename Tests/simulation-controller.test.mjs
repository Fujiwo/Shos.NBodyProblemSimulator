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
  controller.generate();

  const state = store.getState();

  assert.equal(state.appState.uiState.playbackState, "idle");
  assert.equal(state.runtime.simulationTime, 0);
  assert.equal(state.appState.bodyCount, 2);
  assert.deepEqual(
    state.appState.committedInitialState.bodies.map((body) => body.name),
    state.appState.bodies.map((body) => body.name)
  );
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

testTransitionGuards();
testCameraTargetNormalization();
testGenerateResetsRuntimeAndCommitsState();
testStartRejectsValidationErrorsAndSetsStatusMessage();

console.log("simulation-controller.test.mjs ok");