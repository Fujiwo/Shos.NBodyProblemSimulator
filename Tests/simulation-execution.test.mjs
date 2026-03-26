import assert from "node:assert/strict";

import { computeTotalEnergy } from "../Sources/app/physics-engine.js";
import {
  MainThreadSimulationExecutor,
  WorkerSimulationExecutor,
  chooseExecutionMode
} from "../Sources/app/simulation-execution.js";

function createBodies() {
  return [
    {
      id: "body-1",
      name: "sun",
      mass: 1,
      position: { x: -1, y: 0, z: 0 },
      velocity: { x: 0, y: -0.5, z: 0 },
      color: "#fff"
    },
    {
      id: "body-2",
      name: "mercury",
      mass: 1,
      position: { x: 1, y: 0, z: 0 },
      velocity: { x: 0, y: 0.5, z: 0 },
      color: "#fff"
    }
  ];
}

function createConfig(integrator = "velocity-verlet") {
  return {
    gravitationalConstant: 1,
    timeStep: 0.005,
    softening: 0.01,
    integrator,
    maxTrailPoints: 300,
    presetId: "binary-orbit",
    seed: null
  };
}

class FakeWorker {
  constructor() {
    this.listeners = {
      message: new Set(),
      error: new Set()
    };
  }

  addEventListener(type, listener) {
    this.listeners[type].add(listener);
  }

  removeEventListener(type, listener) {
    this.listeners[type].delete(listener);
  }

  postMessage(message) {
    import("../Sources/app/physics-engine.js").then(({ simulateBatch }) => {
      const result = simulateBatch(message.payload);
      queueMicrotask(() => {
        for (const listener of this.listeners.message) {
          listener({
            data: {
              type: "simulate-batch:result",
              payload: {
                ...result,
                runId: message.payload.runId,
                sequence: message.payload.sequence,
                computeTimeMs: 0.25
              }
            }
          });
        }
      });
    });
  }

  terminate() {}
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function testMainThreadAndWorkerExecutorsProduceEquivalentResults() {
  const referenceEnergy = computeTotalEnergy(createBodies(), createConfig("rk4"));
  const job = {
    bodies: createBodies(),
    simulationConfig: createConfig("rk4"),
    stepCount: 20,
    referenceEnergy,
    initialStepCount: 0,
    runId: 1,
    sequence: 1
  };

  const mainExecutor = new MainThreadSimulationExecutor({ now: (() => {
    let value = 0;
    return () => (value += 0.5);
  })() });
  const workerExecutor = new WorkerSimulationExecutor({
    workerFactory: () => new FakeWorker(),
    now: (() => {
      let value = 10;
      return () => (value += 0.75);
    })()
  });

  const mainResult = await mainExecutor.submit(job);
  const workerResultPromise = workerExecutor.submit(job);
  await flushPromises();
  const workerResult = await workerResultPromise;

  assert.equal(mainResult.totalStepCount, workerResult.totalStepCount);
  assert.equal(mainResult.simulationTime, workerResult.simulationTime);

  for (let index = 0; index < mainResult.bodies.length; index += 1) {
    const mainBody = mainResult.bodies[index];
    const workerBody = workerResult.bodies[index];

    for (const vectorKey of ["position", "velocity"]) {
      for (const axis of ["x", "y", "z"]) {
        assert.ok(Math.abs(mainBody[vectorKey][axis] - workerBody[vectorKey][axis]) <= 1e-12);
      }
    }
  }

  assert.ok(Math.abs(mainResult.energyError - workerResult.energyError) <= 1e-12);
  assert.equal(chooseExecutionMode({ requestedMode: "worker", workerSupported: false }), "main");
  assert.equal(chooseExecutionMode({ requestedMode: "worker", workerSupported: true }), "worker");
  assert.equal(chooseExecutionMode({ requestedMode: "auto", workerSupported: true }), "main");

  workerExecutor.dispose();
}

await testMainThreadAndWorkerExecutorsProduceEquivalentResults();

console.log("simulation-execution.test.mjs ok");