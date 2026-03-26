import assert from "node:assert/strict";

import { createInitialAppState } from "../Sources/app/defaults.js";
import { PersistenceFacade } from "../Sources/app/persistence-facade.js";
import { createHydratedAppState } from "../Sources/app/state-rules.js";

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

function testSerializeExcludesTransientPlaybackState() {
  const facade = new PersistenceFacade();
  const appState = createInitialAppState(3);
  appState.uiState.playbackState = "running";

  const serialized = facade.serialize(appState);

  assert.equal(serialized.uiState.playbackState, undefined);
  assert.equal(serialized.playbackRestorePolicy, "restore-as-idle");
  assert.equal(serialized.bodies.length, 3);
}

function testLoadMigratesLegacyNamesAndVersion() {
  installStorage(createLegacyPersistedState());

  const facade = new PersistenceFacade();
  const result = facade.load();

  assert.equal(result.appState.appVersion, "0.4.0-phase4");
  assert.equal(result.statusMessage, "Saved state restored after migration from 0.2.0-phase2.");
  assert.deepEqual(result.appState.bodies.map((body) => body.name), ["sun", "mercury"]);
  assert.deepEqual(result.appState.committedInitialState.bodies.map((body) => body.name), ["sun", "mercury"]);
}

function testLoadFallsBackForInvalidJson() {
  installStorage("{invalid json");

  const facade = new PersistenceFacade();
  const result = facade.load();

  assert.equal(result.statusMessage, "Failed to restore saved state. Defaults were applied.");
  assert.equal(result.appState.uiState.playbackState, "idle");
  assert.ok(result.appState.bodyCount >= 2);
}

function testHydrationNormalizesPresetConstraintsAndSelection() {
  const hydrated = createHydratedAppState({
    appVersion: "0.4.0-phase4",
    bodyCount: 2,
    bodies: [
      { id: "body-1", name: "sun", mass: 1, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" },
      { id: "body-2", name: "mercury", mass: 1, position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, color: "#ffffff" }
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
      playbackState: "paused",
      selectedBodyId: "missing",
      cameraTarget: "missing",
      showTrails: true,
      expandedBodyPanels: ["missing"]
    },
    committedInitialState: null,
    playbackRestorePolicy: "restore-as-idle"
  });

  assert.equal(hydrated.bodyCount, 3);
  assert.equal(hydrated.bodies.length, 3);
  assert.equal(hydrated.uiState.playbackState, "idle");
  assert.equal(hydrated.uiState.selectedBodyId, null);
  assert.equal(hydrated.uiState.cameraTarget, "system-center");
  assert.deepEqual(hydrated.uiState.expandedBodyPanels, []);
}

function testHydrationRetainsRk4Integrator() {
  const hydrated = createHydratedAppState({
    appVersion: "0.4.0-phase4",
    bodyCount: 3,
    bodies: createInitialAppState(3).bodies,
    simulationConfig: {
      presetId: "random-cluster",
      timeStep: 0.005,
      softening: 0.01,
      gravitationalConstant: 1,
      integrator: "rk4",
      maxTrailPoints: 300,
      seed: 1001
    },
    uiState: {
      playbackState: "idle",
      selectedBodyId: null,
      cameraTarget: "system-center",
      showTrails: true,
      expandedBodyPanels: ["body-1"]
    },
    committedInitialState: null,
    playbackRestorePolicy: "restore-as-idle"
  });

  assert.equal(hydrated.simulationConfig.integrator, "rk4");
}

function testHydrationNormalizesExpandedPanelsToValidUniqueBodyOrder() {
  const hydrated = createHydratedAppState({
    appVersion: "0.4.0-phase4",
    bodyCount: 3,
    bodies: createInitialAppState(3).bodies,
    simulationConfig: createInitialAppState(3).simulationConfig,
    uiState: {
      playbackState: "idle",
      selectedBodyId: null,
      cameraTarget: "system-center",
      showTrails: true,
      expandedBodyPanels: ["body-3", "missing", "body-1", "body-1"]
    },
    committedInitialState: null,
    playbackRestorePolicy: "restore-as-idle"
  });

  assert.deepEqual(hydrated.uiState.expandedBodyPanels, ["body-1", "body-3"]);
}

testSerializeExcludesTransientPlaybackState();
testLoadMigratesLegacyNamesAndVersion();
testLoadFallsBackForInvalidJson();
testHydrationNormalizesPresetConstraintsAndSelection();
testHydrationRetainsRk4Integrator();
testHydrationNormalizesExpandedPanelsToValidUniqueBodyOrder();

console.log("persistence-facade.test.mjs ok");