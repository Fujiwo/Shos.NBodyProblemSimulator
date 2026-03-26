import assert from "node:assert/strict";

import {
  computeAccelerations,
  computeTotalEnergy,
  simulateBatch,
  stepRungeKutta4,
  stepVelocityVerlet
} from "../Sources/app/physics-engine.js";

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

function testRk4AdvancesState() {
  const bodies = createTwoBodySystem();
  const before = JSON.parse(JSON.stringify(bodies));

  stepRungeKutta4(bodies, createSimulationConfig({ integrator: "rk4" }));

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

function testSimulateBatchReturnsFiniteEnergyErrorForBothIntegrators() {
  const referenceBodies = createTwoBodySystem();
  const referenceEnergy = computeTotalEnergy(referenceBodies, createSimulationConfig());

  const verletResult = simulateBatch({
    bodies: createTwoBodySystem(),
    simulationConfig: createSimulationConfig({ integrator: "velocity-verlet" }),
    stepCount: 10,
    referenceEnergy,
    initialStepCount: 0
  });

  const rk4Result = simulateBatch({
    bodies: createTwoBodySystem(),
    simulationConfig: createSimulationConfig({ integrator: "rk4" }),
    stepCount: 10,
    referenceEnergy,
    initialStepCount: 0
  });

  assert.ok(Number.isFinite(verletResult.energyError));
  assert.ok(Number.isFinite(rk4Result.energyError));
  assert.equal(verletResult.totalStepCount, 10);
  assert.equal(rk4Result.totalStepCount, 10);
}

testComputeAccelerationsIsSymmetric();
testVelocityVerletAdvancesState();
testRk4AdvancesState();
testComputeTotalEnergyIsFinite();
testSofteningPreventsSingularity();
testSimulateBatchReturnsFiniteEnergyErrorForBothIntegrators();

console.log("physics-engine.test.mjs ok");