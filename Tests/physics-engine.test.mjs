import assert from "node:assert/strict";

import { computeAccelerations, computeTotalEnergy, stepVelocityVerlet } from "../Sources/app/physics-engine.js";

function createTwoBodySystem() {
  return [
    {
      id: "body-1",
      name: "sun",
      mass: 1,
      position: { x: -1, y: 0, z: 0 },
      velocity: { x: 0, y: -0.5, z: 0 },
      color: "#ffffff"
    },
    {
      id: "body-2",
      name: "mercury",
      mass: 1,
      position: { x: 1, y: 0, z: 0 },
      velocity: { x: 0, y: 0.5, z: 0 },
      color: "#ffffff"
    }
  ];
}

function createSimulationConfig(overrides = {}) {
  return {
    gravitationalConstant: 1,
    timeStep: 0.01,
    softening: 0.01,
    integrator: "velocity-verlet",
    maxTrailPoints: 300,
    presetId: "binary-orbit",
    seed: null,
    ...overrides
  };
}

function testComputeAccelerationsIsSymmetric() {
  const accelerations = computeAccelerations(createTwoBodySystem(), createSimulationConfig());

  assert.equal(accelerations.length, 2);
  assert.ok(accelerations[0].x > 0);
  assert.ok(accelerations[1].x < 0);
  assert.ok(Math.abs(accelerations[0].x + accelerations[1].x) < 1e-12);
  assert.ok(Math.abs(accelerations[0].y + accelerations[1].y) < 1e-12);
  assert.ok(Math.abs(accelerations[0].z + accelerations[1].z) < 1e-12);
}

function testVelocityVerletAdvancesState() {
  const bodies = createTwoBodySystem();
  const before = JSON.parse(JSON.stringify(bodies));

  stepVelocityVerlet(bodies, createSimulationConfig());

  assert.notDeepEqual(
    bodies.map((body) => body.position),
    before.map((body) => body.position)
  );
  assert.notDeepEqual(
    bodies.map((body) => body.velocity),
    before.map((body) => body.velocity)
  );
}

function testComputeTotalEnergyIsFinite() {
  const energy = computeTotalEnergy(createTwoBodySystem(), createSimulationConfig());

  assert.ok(Number.isFinite(energy));
  assert.ok(energy < 0);
}

function testSofteningPreventsSingularity() {
  const bodies = [
    {
      id: "body-1",
      name: "sun",
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      color: "#ffffff"
    },
    {
      id: "body-2",
      name: "mercury",
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      color: "#ffffff"
    }
  ];

  const accelerations = computeAccelerations(bodies, createSimulationConfig({ softening: 0.05 }));
  const energy = computeTotalEnergy(bodies, createSimulationConfig({ softening: 0.05 }));

  for (const acceleration of accelerations) {
    assert.ok(Number.isFinite(acceleration.x));
    assert.ok(Number.isFinite(acceleration.y));
    assert.ok(Number.isFinite(acceleration.z));
  }

  assert.ok(Number.isFinite(energy));
}

testComputeAccelerationsIsSymmetric();
testVelocityVerletAdvancesState();
testComputeTotalEnergyIsFinite();
testSofteningPreventsSingularity();

console.log("physics-engine.test.mjs ok");