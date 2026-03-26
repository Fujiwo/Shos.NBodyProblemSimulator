import assert from "node:assert/strict";

import { createInitialAppState } from "../Sources/app/defaults.js";
import { createCommittedInitialState, restoreCommittedInitialState } from "../Sources/app/committed-state.js";

function testCreateCommittedInitialStateClonesSnapshotFields() {
  const appState = createInitialAppState(3);
  appState.uiState.selectedBodyId = "body-2";
  appState.uiState.cameraTarget = "body-3";
  appState.uiState.showTrails = false;

  const snapshot = createCommittedInitialState(appState);

  appState.bodies[0].position.x = 999;
  appState.simulationConfig.seed = 42;
  appState.uiState.selectedBodyId = null;

  assert.equal(snapshot.bodyCount, 3);
  assert.notEqual(snapshot.bodies, appState.bodies);
  assert.notEqual(snapshot.simulationConfig, appState.simulationConfig);
  assert.equal(snapshot.bodies[0].position.x, createInitialAppState(3).bodies[0].position.x);
  assert.equal(snapshot.simulationConfig.seed, 1001);
  assert.equal(snapshot.uiState.selectedBodyId, "body-2");
  assert.equal(snapshot.uiState.cameraTarget, "body-3");
  assert.equal(snapshot.uiState.showTrails, false);
}

function testRestoreCommittedInitialStateBuildsDetachedAppStateShape() {
  const appState = createInitialAppState(3);
  appState.uiState.selectedBodyId = "body-2";
  const snapshot = createCommittedInitialState(appState);

  const restored = restoreCommittedInitialState(snapshot, {
    playbackState: "running",
    expandedBodyPanels: ["body-2", "body-3"]
  });

  snapshot.bodies[0].position.x = 777;
  snapshot.simulationConfig.seed = 9;

  assert.equal(restored.bodyCount, 3);
  assert.equal(restored.uiState.playbackState, "running");
  assert.equal(restored.uiState.selectedBodyId, "body-2");
  assert.deepEqual(restored.uiState.expandedBodyPanels, ["body-2", "body-3"]);
  assert.equal(restored.bodies[0].position.x, appState.bodies[0].position.x);
  assert.equal(restored.simulationConfig.seed, 1001);
}

testCreateCommittedInitialStateClonesSnapshotFields();
testRestoreCommittedInitialStateBuildsDetachedAppStateShape();

console.log("committed-state.test.mjs ok");