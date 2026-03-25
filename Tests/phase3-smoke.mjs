import assert from "node:assert/strict";

import { AppStore } from "../Sources/app/app-store.js";
import { createInitialModel } from "../Sources/app/defaults.js";
import { PersistenceFacade } from "../Sources/app/persistence-facade.js";
import { SimulationController } from "../Sources/app/simulation-controller.js";

function testControllerTransitionGuards() {
  const store = new AppStore(createInitialModel());
  const persistence = { stage() {} };
  const controller = new SimulationController(store, persistence);
  const loopCalls = [];

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

function testPersistenceMigration() {
  const storage = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, value);
    }
  };

  storage.set("nbody-simulator.state", JSON.stringify({
    appVersion: "0.2.0-phase2",
    bodyCount: 3,
    bodies: [
      { id: "body-1", name: "Primary", mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" },
      { id: "body-2", name: "Secondary", mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" },
      { id: "body-3", name: "Body C", mass: 1, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" }
    ],
    simulationConfig: {
      presetId: "three-body-figure-eight",
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
      bodyCount: 3,
      bodies: [
        { id: "body-1", name: "Body A", mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" },
        { id: "body-2", name: "Body B", mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" },
        { id: "body-3", name: "Body C", mass: 1, position: { x: 0, y: 1, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" }
      ],
      simulationConfig: {
        presetId: "three-body-figure-eight",
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
  }));

  const facade = new PersistenceFacade();
  const result = facade.load();

  assert.equal(result.appState.appVersion, "0.3.0-phase3");
  assert.deepEqual(result.appState.bodies.map((body) => body.name), ["sun", "mercury", "venus"]);
  assert.deepEqual(result.appState.committedInitialState.bodies.map((body) => body.name), ["sun", "mercury", "venus"]);
}

function testCameraTargetNormalization() {
  const store = new AppStore(createInitialModel());
  const persistence = { stage() {} };
  const controller = new SimulationController(store, persistence);

  controller.updateSelectedBody("body-2");
  controller.updateCameraTarget("body-2");
  controller.updateCameraTarget("missing-body");

  const state = store.getState();

  assert.equal(state.appState.uiState.selectedBodyId, "body-2");
  assert.equal(state.appState.uiState.cameraTarget, "system-center");
}

testControllerTransitionGuards();
testPersistenceMigration();
testCameraTargetNormalization();

console.log("phase3-smoke-ok");