import assert from "node:assert/strict";

import { computeTotalEnergy } from "../Sources/app/physics-engine.js";
import {
  decodeBodyStateBuffer,
  encodeBodyStateBuffer,
  MainThreadSimulationExecutor,
  WorkerSimulationExecutor,
  chooseExecutionMode,
  createSimulationJob,
  createSimulationRequestKey
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
      const result = simulateBatch({
        bodies: decodeBodyStateBuffer(message.payload.bodyStateBuffer),
        simulationConfig: message.payload.simulationConfig,
        stepCount: message.payload.stepCount,
        referenceEnergy: message.payload.referenceEnergy,
        initialStepCount: message.payload.initialStepCount
      });
      const bodyStateBuffer = encodeBodyStateBuffer(result.bodies).buffer;

      queueMicrotask(() => {
        for (const listener of this.listeners.message) {
          listener({
            data: {
              type: "simulate-batch:result",
              payload: {
                totalEnergy: result.totalEnergy,
                energyError: result.energyError,
                totalStepCount: result.totalStepCount,
                simulationTime: result.simulationTime,
                bodyStateBuffer,
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

class ErroringWorker {
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

  postMessage() {
    queueMicrotask(() => {
      for (const listener of this.listeners.error) {
        listener(new Error("worker failure"));
      }
    });
  }

  terminate() {}
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function testMainThreadAndWorkerExecutorsProduceEquivalentResults() {
  const referenceEnergy = computeTotalEnergy(createBodies(), createConfig("rk4"));
  const appState = {
    bodies: createBodies(),
    simulationConfig: createConfig("rk4")
  };
  const job = createSimulationJob({
    appState,
    stepCount: 20,
    referenceEnergy,
    initialStepCount: 0,
    runId: 1,
    sequence: 1
  });

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
  assert.equal(createSimulationRequestKey(job.runId, job.sequence), "1:1");
  assert.equal(chooseExecutionMode({ requestedMode: "worker", workerSupported: false }), "main");
  assert.equal(chooseExecutionMode({ requestedMode: "worker", workerSupported: true }), "worker");
  assert.equal(chooseExecutionMode({ requestedMode: "auto", workerSupported: true }), "main");

  workerExecutor.dispose();
}

async function testCreateExecutorFallsBackToMainThreadAfterWorkerRuntimeError() {
  globalThis.Worker = class {};
  const { createSimulationExecutor } = await import("../Sources/app/simulation-execution.js");
  const executor = createSimulationExecutor({
    requestedMode: "worker",
    workerFactory: () => new ErroringWorker(),
    now: (() => {
      let value = 0;
      return () => (value += 1);
    })()
  });

  const referenceEnergy = computeTotalEnergy(createBodies(), createConfig("velocity-verlet"));
  const result = await executor.submit({
    ...createSimulationJob({
      appState: {
        bodies: createBodies(),
        simulationConfig: createConfig("velocity-verlet")
      },
      stepCount: 2,
      referenceEnergy,
      initialStepCount: 0,
      runId: 1,
      sequence: 1
    })
  });

  assert.equal(executor.getStatus().mode, "main");
  assert.equal(result.mode, "main");
  assert.equal(result.statusMessage, "Worker runtime error detected. Automatically switched to main-thread simulation.");
  executor.dispose();
  delete globalThis.Worker;
}

await testMainThreadAndWorkerExecutorsProduceEquivalentResults();
await testCreateExecutorFallsBackToMainThreadAfterWorkerRuntimeError();

console.log("simulation-execution.test.mjs ok");