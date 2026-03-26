import assert from "node:assert/strict";

import { generatePresetBodies } from "../Sources/app/preset-generator.js";

function testRandomClusterIsDeterministicForSameSeedAndBodyCount() {
  const first = generatePresetBodies({
    presetId: "random-cluster",
    bodyCount: 5,
    seed: 1001
  });
  const second = generatePresetBodies({
    presetId: "random-cluster",
    bodyCount: 5,
    seed: 1001
  });

  assert.equal(first.seed, 1001);
  assert.equal(second.seed, 1001);
  assert.deepEqual(first.bodies, second.bodies);
}

function testRandomClusterOutputChangesWhenBodyCountChanges() {
  const smaller = generatePresetBodies({
    presetId: "random-cluster",
    bodyCount: 4,
    seed: 1001
  });
  const larger = generatePresetBodies({
    presetId: "random-cluster",
    bodyCount: 6,
    seed: 1001
  });

  assert.equal(smaller.seed, 1001);
  assert.equal(larger.seed, 1001);
  assert.equal(smaller.bodyCount, 4);
  assert.equal(larger.bodyCount, 6);
  assert.notDeepEqual(smaller.bodies, larger.bodies);
}

function testRandomClusterUsesTimeSeedWhenSeedIsMissing() {
  const originalNow = Date.now;
  Date.now = () => 1234567890;

  try {
    const generated = generatePresetBodies({
      presetId: "random-cluster",
      bodyCount: 3,
      seed: null
    });

    assert.equal(generated.seed, 1234567890);
  } finally {
    Date.now = originalNow;
  }
}

testRandomClusterIsDeterministicForSameSeedAndBodyCount();
testRandomClusterOutputChangesWhenBodyCountChanges();
testRandomClusterUsesTimeSeedWhenSeedIsMissing();

console.log("preset-generator.test.mjs ok");