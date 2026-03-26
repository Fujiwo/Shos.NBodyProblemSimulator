import assert from "node:assert/strict";

import { generatePresetBodies } from "../Sources/app/preset-generator.js";
import { DEFAULT_BODY_SEED_DATA } from "../Sources/data/default-bodies.js";

function testSamplePresetUsesBundledDefaultBodies() {
  const generated = generatePresetBodies({
    presetId: "sample",
    bodyCount: 3,
    seed: 1001
  });

  assert.equal(generated.presetId, "sample");
  assert.equal(generated.seed, null);
  assert.equal(generated.bodyCount, DEFAULT_BODY_SEED_DATA.length);

  DEFAULT_BODY_SEED_DATA.forEach((expectedBody, index) => {
    assert.equal(generated.bodies[index].name, expectedBody.name);
    assert.equal(generated.bodies[index].mass, expectedBody.mass);
    assert.deepEqual(generated.bodies[index].position, expectedBody.position);
    assert.deepEqual(generated.bodies[index].velocity, expectedBody.velocity);
  });
}

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

function testRandomClusterUsesExpandedVarianceRange() {
  const generated = generatePresetBodies({
    presetId: "random-cluster",
    bodyCount: 8,
    seed: 1001
  });

  const masses = generated.bodies.map((body) => body.mass);
  const positionRadii = generated.bodies.map((body) => Math.hypot(body.position.x, body.position.y, body.position.z));
  const speeds = generated.bodies.map((body) => Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z));

  assert.ok(masses.every((mass) => mass >= 0.05 && mass <= 120));
  assert.ok(positionRadii.every((radius) => radius <= 6));
  assert.ok(speeds.some((speed) => speed >= 0.3));
  assert.ok(positionRadii.some((radius) => radius >= 2));
  assert.ok(Math.max(...masses) - Math.min(...masses) >= 30);
}

testSamplePresetUsesBundledDefaultBodies();
testRandomClusterIsDeterministicForSameSeedAndBodyCount();
testRandomClusterOutputChangesWhenBodyCountChanges();
testRandomClusterUsesTimeSeedWhenSeedIsMissing();
testRandomClusterUsesExpandedVarianceRange();

console.log("preset-generator.test.mjs ok");