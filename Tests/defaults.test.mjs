import assert from "node:assert/strict";

import { DEFAULT_BODY_SEED_DATA } from "../Sources/data/default-bodies.js";
import { clampBodyCount, createBody, createInitialAppState } from "../Sources/app/defaults.js";

function testInitialAppStateDefaultsToBundledEightBodyDataset() {
  const appState = createInitialAppState();

  assert.equal(appState.bodyCount, 8);
  assert.equal(appState.bodies.length, 8);

  DEFAULT_BODY_SEED_DATA.forEach((expectedBody, index) => {
    const body = appState.bodies[index];

    assert.equal(body.id, `body-${index + 1}`);
    assert.equal(body.name, expectedBody.name);
    assert.equal(body.mass, expectedBody.mass);
    assert.deepEqual(body.position, expectedBody.position);
    assert.deepEqual(body.velocity, expectedBody.velocity);
  });
}

function testCreateBodyUsesBundledDatasetForFirstEightBodies() {
  const body = createBody(0);

  assert.equal(body.name, DEFAULT_BODY_SEED_DATA[0].name);
  assert.equal(body.mass, DEFAULT_BODY_SEED_DATA[0].mass);
  assert.deepEqual(body.position, DEFAULT_BODY_SEED_DATA[0].position);
  assert.deepEqual(body.velocity, DEFAULT_BODY_SEED_DATA[0].velocity);
}

function testClampBodyCountFallsBackToEight() {
  assert.equal(clampBodyCount("invalid"), 8);
}

testInitialAppStateDefaultsToBundledEightBodyDataset();
testCreateBodyUsesBundledDatasetForFirstEightBodies();
testClampBodyCountFallsBackToEight();

console.log("defaults.test.mjs ok");