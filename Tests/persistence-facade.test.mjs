import assert from "node:assert/strict";

import { createInitialAppState } from "../Sources/app/defaults.js";
import { PersistenceFacade } from "../Sources/app/persistence-facade.js";
import { PERSISTENCE_POLICY, createHydratedAppState } from "../Sources/app/state-rules.js";

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

function createLegacyPersistedState(overrides = {}) {
  const baseState = {
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
  };

  return JSON.stringify({
    ...baseState,
    ...overrides,
    committedInitialState: Object.prototype.hasOwnProperty.call(overrides, "committedInitialState")
      ? overrides.committedInitialState
      : baseState.committedInitialState
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

function testSerializeNormalizesExpandedPanelsAndRestorePolicy() {
  const facade = new PersistenceFacade();
  const appState = createInitialAppState(3);
  appState.uiState.expandedBodyPanels = ["body-3", "missing", "body-1", "body-1"];
  appState.playbackRestorePolicy = "unexpected-policy";

  const serialized = facade.serialize(appState);

  assert.deepEqual(serialized.uiState.expandedBodyPanels, ["body-1", "body-3"]);
  assert.equal(serialized.playbackRestorePolicy, "restore-as-idle");
}

function testPersistencePolicyExplicitlyExcludesLifecycleObservabilityFields() {
  assert.equal(PERSISTENCE_POLICY.nonPersistedRuntimeFields.includes("lifecycleMetadata"), true);
  assert.equal(PERSISTENCE_POLICY.nonPersistedRuntimeFields.includes("lifecycleNotice"), true);

  const facade = new PersistenceFacade();
  const appState = createInitialAppState(3);
  appState.lifecycleMetadata = {
    reinitializeReason: "manual-restart"
  };
  appState.lifecycleNotice = "Restart manual-restart #3 @ 2026-03-27T00:00:00.000Z";

  const serialized = facade.serialize(appState);

  assert.equal(serialized.lifecycleMetadata, undefined);
  assert.equal(serialized.lifecycleNotice, undefined);
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

function testLoadFallsBackForValidJsonWithInvalidShape() {
  installStorage("42");

  const facade = new PersistenceFacade();
  const result = facade.load();

  assert.equal(result.statusMessage, "Failed to restore saved state. Defaults were applied.");
  assert.equal(result.appState.uiState.playbackState, "idle");
  assert.equal(result.appState.simulationConfig.seed, 1001);
}

function testLoadRebuildsCommittedSnapshotWhenLegacySnapshotShapeIsCorrupted() {
  installStorage(createLegacyPersistedState({
    committedInitialState: 42
  }));

  const facade = new PersistenceFacade();
  const result = facade.load();

  assert.equal(result.statusMessage, "Saved state restored after migration from 0.2.0-phase2.");
  assert.equal(result.appState.committedInitialState.bodyCount, result.appState.bodyCount);
  assert.deepEqual(
    result.appState.committedInitialState.bodies.map((body) => body.name),
    result.appState.bodies.map((body) => body.name)
  );
  assert.equal(result.appState.committedInitialState.uiState.selectedBodyId, "body-1");
  assert.equal(result.appState.committedInitialState.uiState.cameraTarget, "system-center");
  assert.equal(result.appState.committedInitialState.uiState.showTrails, true);
}

function testLoadNormalizesCorruptedLegacyCommittedSnapshotFields() {
  installStorage(createLegacyPersistedState({
    committedInitialState: {
      bodyCount: 99,
      bodies: "bad bodies",
      simulationConfig: {
        presetId: "binary-orbit",
        timeStep: -1,
        softening: -2,
        gravitationalConstant: "bad",
        integrator: "bad",
        maxTrailPoints: -5,
        seed: 9999999999
      },
      uiState: {
        selectedBodyId: "missing",
        cameraTarget: "missing",
        showTrails: "bad"
      }
    }
  }));

  const facade = new PersistenceFacade();
  const result = facade.load();
  const snapshot = result.appState.committedInitialState;

  assert.equal(result.statusMessage, "Saved state restored after migration from 0.2.0-phase2.");
  assert.equal(snapshot.bodyCount, 2);
  assert.equal(snapshot.bodies.length, 2);
  assert.equal(snapshot.simulationConfig.presetId, "binary-orbit");
  assert.equal(snapshot.simulationConfig.seed, null);
  assert.equal(snapshot.simulationConfig.timeStep, 0.005);
  assert.equal(snapshot.simulationConfig.softening, 0.01);
  assert.equal(snapshot.simulationConfig.integrator, "velocity-verlet");
  assert.equal(snapshot.uiState.selectedBodyId, null);
  assert.equal(snapshot.uiState.cameraTarget, "system-center");
  assert.equal(snapshot.uiState.showTrails, true);
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

function testHydrationNormalizesFixedPresetSeedToNull() {
  const hydrated = createHydratedAppState({
    appVersion: "0.4.0-phase4",
    bodyCount: 2,
    bodies: createInitialAppState(2).bodies,
    simulationConfig: {
      presetId: "binary-orbit",
      timeStep: 0.005,
      softening: 0.01,
      gravitationalConstant: 1,
      integrator: "velocity-verlet",
      maxTrailPoints: 300,
      seed: 9999999999
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

  assert.equal(hydrated.simulationConfig.seed, null);
}

function testHydrationNormalizesCorruptedBodyMassAndVectors() {
  const fallbackBodies = createInitialAppState(3).bodies;
  const hydrated = createHydratedAppState({
    appVersion: "0.4.0-phase4",
    bodyCount: 3,
    bodies: [
      {
        id: "body-1",
        name: "sun",
        mass: 0,
        position: { x: Infinity, y: 2, z: 3 },
        velocity: { x: 4, y: NaN, z: 6 },
        color: "#ffffff"
      },
      {
        id: "body-2",
        name: "mercury",
        mass: -5,
        position: { x: 7, y: 8, z: "bad" },
        velocity: { x: "bad", y: 11, z: 12 },
        color: "#ffffff"
      },
      {
        id: "body-3",
        name: "venus",
        mass: 3,
        position: { x: 13, y: 14, z: 15 },
        velocity: { x: 16, y: 17, z: 18 },
        color: "#ffffff"
      }
    ],
    simulationConfig: createInitialAppState(3).simulationConfig,
    uiState: {
      playbackState: "idle",
      selectedBodyId: null,
      cameraTarget: "system-center",
      showTrails: true,
      expandedBodyPanels: ["body-1"]
    },
    committedInitialState: {
      bodyCount: 3,
      bodies: [
        {
          id: "body-1",
          name: "sun",
          mass: -1,
          position: { x: Infinity, y: 0, z: 0 },
          velocity: { x: 0, y: NaN, z: 0 },
          color: "#ffffff"
        },
        fallbackBodies[1],
        fallbackBodies[2]
      ],
      simulationConfig: createInitialAppState(3).simulationConfig,
      uiState: {
        selectedBodyId: null,
        cameraTarget: "system-center",
        showTrails: true
      }
    },
    playbackRestorePolicy: "restore-as-idle"
  });

  assert.equal(hydrated.bodies[0].mass, fallbackBodies[0].mass);
  assert.equal(hydrated.bodies[0].position.x, fallbackBodies[0].position.x);
  assert.equal(hydrated.bodies[0].position.y, 2);
  assert.equal(hydrated.bodies[0].velocity.x, 4);
  assert.equal(hydrated.bodies[0].velocity.y, fallbackBodies[0].velocity.y);
  assert.equal(hydrated.bodies[1].mass, fallbackBodies[1].mass);
  assert.equal(hydrated.bodies[1].position.z, fallbackBodies[1].position.z);
  assert.equal(hydrated.bodies[1].velocity.x, fallbackBodies[1].velocity.x);
  assert.equal(hydrated.committedInitialState.bodies[0].mass, fallbackBodies[0].mass);
  assert.equal(hydrated.committedInitialState.bodies[0].position.x, fallbackBodies[0].position.x);
  assert.equal(hydrated.committedInitialState.bodies[0].velocity.y, fallbackBodies[0].velocity.y);
}

function testHydrationNormalizesCorruptedBodyNameAndColor() {
  const fallbackBodies = createInitialAppState(3).bodies;
  const hydrated = createHydratedAppState({
    appVersion: "0.4.0-phase4",
    bodyCount: 3,
    bodies: [
      {
        id: "body-1",
        name: "",
        mass: 1,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        color: ""
      },
      {
        id: "body-2",
        name: 42,
        mass: 1,
        position: { x: 1, y: 1, z: 1 },
        velocity: { x: 1, y: 1, z: 1 },
        color: null
      },
      {
        id: "body-3",
        name: "x".repeat(33),
        mass: 1,
        position: { x: 2, y: 2, z: 2 },
        velocity: { x: 2, y: 2, z: 2 },
        color: "#123456"
      }
    ],
    simulationConfig: createInitialAppState(3).simulationConfig,
    uiState: {
      playbackState: "idle",
      selectedBodyId: null,
      cameraTarget: "system-center",
      showTrails: true,
      expandedBodyPanels: ["body-1"]
    },
    committedInitialState: {
      bodyCount: 3,
      bodies: [
        {
          id: "body-1",
          name: "",
          mass: 1,
          position: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          color: ""
        },
        fallbackBodies[1],
        fallbackBodies[2]
      ],
      simulationConfig: createInitialAppState(3).simulationConfig,
      uiState: {
        selectedBodyId: null,
        cameraTarget: "system-center",
        showTrails: true
      }
    },
    playbackRestorePolicy: "restore-as-idle"
  });

  assert.equal(hydrated.bodies[0].name, fallbackBodies[0].name);
  assert.equal(hydrated.bodies[0].color, fallbackBodies[0].color);
  assert.equal(hydrated.bodies[1].name, fallbackBodies[1].name);
  assert.equal(hydrated.bodies[1].color, fallbackBodies[1].color);
  assert.equal(hydrated.bodies[2].name, fallbackBodies[2].name);
  assert.equal(hydrated.bodies[2].color, "#123456");
  assert.equal(hydrated.committedInitialState.bodies[0].name, fallbackBodies[0].name);
  assert.equal(hydrated.committedInitialState.bodies[0].color, fallbackBodies[0].color);
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

function testHydrationRejectsOutOfRangeSeedValues() {
  const fallbackSeed = createInitialAppState(3).simulationConfig.seed;
  const hydrated = createHydratedAppState({
    appVersion: "0.4.0-phase4",
    bodyCount: 3,
    bodies: createInitialAppState(3).bodies,
    simulationConfig: {
      presetId: "random-cluster",
      timeStep: 0.005,
      softening: 0.01,
      gravitationalConstant: 1,
      integrator: "velocity-verlet",
      maxTrailPoints: 300,
      seed: 4294967296
    },
    uiState: {
      playbackState: "idle",
      selectedBodyId: null,
      cameraTarget: "system-center",
      showTrails: true,
      expandedBodyPanels: ["body-1"]
    },
    committedInitialState: {
      bodyCount: 3,
      bodies: createInitialAppState(3).bodies,
      simulationConfig: {
        presetId: "random-cluster",
        timeStep: 0.005,
        softening: 0.01,
        gravitationalConstant: 1,
        integrator: "velocity-verlet",
        maxTrailPoints: 300,
        seed: 9999999999
      },
      uiState: {
        selectedBodyId: null,
        cameraTarget: "system-center",
        showTrails: true
      }
    },
    playbackRestorePolicy: "restore-as-idle"
  });

  assert.equal(hydrated.simulationConfig.seed, fallbackSeed);
  assert.equal(hydrated.committedInitialState.simulationConfig.seed, fallbackSeed);
}

testSerializeExcludesTransientPlaybackState();
testSerializeNormalizesExpandedPanelsAndRestorePolicy();
testPersistencePolicyExplicitlyExcludesLifecycleObservabilityFields();
testLoadMigratesLegacyNamesAndVersion();
testLoadFallsBackForInvalidJson();
testLoadFallsBackForValidJsonWithInvalidShape();
testLoadRebuildsCommittedSnapshotWhenLegacySnapshotShapeIsCorrupted();
testLoadNormalizesCorruptedLegacyCommittedSnapshotFields();
testHydrationNormalizesPresetConstraintsAndSelection();
testHydrationRetainsRk4Integrator();
testHydrationNormalizesFixedPresetSeedToNull();
testHydrationNormalizesCorruptedBodyMassAndVectors();
testHydrationNormalizesCorruptedBodyNameAndColor();
testHydrationNormalizesExpandedPanelsToValidUniqueBodyOrder();
testHydrationRejectsOutOfRangeSeedValues();

console.log("persistence-facade.test.mjs ok");