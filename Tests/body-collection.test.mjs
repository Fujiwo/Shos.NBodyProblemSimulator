import assert from "node:assert/strict";

import { createBodies, createUiState } from "../Sources/app/defaults.js";
import { normalizePresetBodyCollection } from "../Sources/app/body-collection.js";

function testPresetNormalizationShrinksBodiesAndClearsInvalidReferences() {
  const bodies = createBodies(8);
  const uiState = createUiState(bodies);
  uiState.selectedBodyId = "body-8";
  uiState.cameraTarget = "body-8";
  uiState.expandedBodyPanels = ["body-1", "body-3", "body-8"];

  const result = normalizePresetBodyCollection({
    presetId: "binary-orbit",
    bodyCount: 8,
    bodies,
    uiState,
    fieldDrafts: {
      "body:body-8:name": "draft",
      "body:body-4:mass": "5",
      seed: "123"
    }
  });

  assert.equal(result.bodyCount, 2);
  assert.equal(result.bodies.length, 2);
  assert.equal(result.uiState.selectedBodyId, null);
  assert.equal(result.uiState.cameraTarget, "system-center");
  assert.deepEqual(result.uiState.expandedBodyPanels, ["body-1"]);
  assert.equal(result.fieldDrafts["body:body-8:name"], undefined);
  assert.equal(result.fieldDrafts["body:body-4:mass"], undefined);
  assert.equal(result.fieldDrafts.seed, "123");
}

function testPresetNormalizationExpandsBodiesWithDefaultCards() {
  const bodies = createBodies(2);
  const result = normalizePresetBodyCollection({
    presetId: "random-cluster",
    bodyCount: 3,
    bodies,
    uiState: createUiState(bodies),
    fieldDrafts: {}
  });

  assert.equal(result.bodyCount, 3);
  assert.equal(result.bodies.length, 3);
  assert.equal(result.bodies[2].id, "body-3");
  assert.equal(result.bodies[2].name.length > 0, true);
}

testPresetNormalizationShrinksBodiesAndClearsInvalidReferences();
testPresetNormalizationExpandsBodiesWithDefaultCards();

console.log("body-collection.test.mjs ok");