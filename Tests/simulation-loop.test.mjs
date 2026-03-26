import assert from "node:assert/strict";

import { AppStore } from "../Sources/app/app-store.js";
import { createInitialModel } from "../Sources/app/defaults.js";
import { SimulationLoop } from "../Sources/app/simulation-loop.js";
import { computeTotalEnergy } from "../Sources/app/physics-engine.js";

function installAnimationFrameStub() {
  let nextId = 1;
  globalThis.requestAnimationFrame = () => nextId++;
  globalThis.cancelAnimationFrame = () => {};
}

function createLoopHarness() {
  installAnimationFrameStub();
  const model = createInitialModel();
  const store = new AppStore(model);
  const executionBackend = {
    submit(job) {
      return Promise.resolve({
        bodies: job.bodies.map((body) => ({
          ...body,
          position: { ...body.position, x: body.position.x + 0.1 },
          velocity: { ...body.velocity, y: body.velocity.y + 0.1 }
        })),
        energyError: 1e-4,
        totalStepCount: job.initialStepCount + job.stepCount,
        simulationTime: (job.initialStepCount + job.stepCount) * Number(job.simulationConfig.timeStep),
        runId: job.runId,
        sequence: job.sequence,
        pipelineTimeMs: 1.5,
        statusMessage: job.sequence === 1
          ? "Worker runtime error detected. Automatically switched to main-thread simulation."
          : ""
      });
    },
    dispose() {}
  };
  const loop = new SimulationLoop(store, executionBackend);
  return { store, loop };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function setPlaybackState(store, playbackState) {
  store.update((model) => {
    model.appState.uiState.playbackState = playbackState;
  });
}

async function testAccumulatorCapLimitsStepsPerFrame() {
  const { store, loop } = createLoopHarness();

  loop.prepareForStart();
  setPlaybackState(store, "running");
  loop.lastFrameTime = 0;

  loop.handleFrame(1000);
  await flushPromises();

  const state = store.getState();

  assert.equal(loop.stepCount, 4);
  assert.equal(state.runtime.simulationTime, 0.02);
  assert.ok(Math.abs(loop.accumulator - 0.23) < 1e-12);
  assert.equal(state.runtime.metrics.pipelineTime, "1.50 ms");
  assert.equal(state.runtime.executionNotice, "Worker runtime error detected. Automatically switched to main-thread simulation.");
}

function testPausedStateDoesNotAdvanceBodiesOrTime() {
  const { store, loop } = createLoopHarness();
  const before = store.getState();

  setPlaybackState(store, "paused");
  loop.lastFrameTime = 10;
  loop.accumulator = 0.07;

  loop.handleFrame(210);

  const after = store.getState();

  assert.equal(after.runtime.simulationTime, before.runtime.simulationTime);
  assert.deepEqual(after.appState.bodies, before.appState.bodies);
  assert.equal(loop.lastFrameTime, 210);
  assert.equal(loop.accumulator, 0.07);
}

function testFpsWindowUpdatesAfterThreshold() {
  const { store, loop } = createLoopHarness();

  setPlaybackState(store, "running");
  loop.updateFps(100);

  assert.equal(store.getState().runtime.metrics.fps, "--");

  loop.updateFps(650);

  assert.equal(store.getState().runtime.metrics.fps, "3.6");
  assert.equal(loop.framesInWindow, 0);
  assert.equal(loop.fpsWindowStart, 650);
}

function testEnergyReferenceResetsAndReinitializes() {
  const { store, loop } = createLoopHarness();

  const initialEnergy = computeTotalEnergy(
    store.getState().appState.bodies,
    store.getState().appState.simulationConfig
  );

  loop.prepareForStart();
  assert.ok(Number.isFinite(loop.referenceEnergy));
  assert.ok(Math.abs(loop.referenceEnergy - initialEnergy) < 1e-12);

  loop.reset();
  assert.equal(loop.referenceEnergy, null);

  setPlaybackState(store, "running");
  loop.lastFrameTime = 0;
  loop.handleFrame(1000);

  return flushPromises().then(() => {
    const state = store.getState();
    assert.ok(Number.isFinite(loop.referenceEnergy));
    assert.notEqual(state.runtime.metrics.energyError, "--");
  });
}

function testIdleStateDoesNotUpdateFpsMetric() {
  const { store, loop } = createLoopHarness();

  setPlaybackState(store, "idle");
  loop.handleFrame(100);
  loop.handleFrame(700);

  const state = store.getState();

  assert.equal(state.runtime.metrics.fps, "--");
}

function testInvalidTimeStepIsNoOp() {
  const { store, loop } = createLoopHarness();
  const before = store.getState();

  store.update((model) => {
    model.appState.simulationConfig.timeStep = 0;
    model.appState.uiState.playbackState = "running";
  });

  loop.lastFrameTime = 0;
  loop.handleFrame(1000);

  const after = store.getState();

  assert.equal(loop.stepCount, 0);
  assert.equal(after.runtime.simulationTime, before.runtime.simulationTime);
  assert.deepEqual(after.appState.bodies, before.appState.bodies);
}

async function testStaleAsyncResultsAreIgnoredAfterReset() {
  installAnimationFrameStub();
  const store = new AppStore(createInitialModel());
  let resolver = null;
  const loop = new SimulationLoop(store, {
    submit(job) {
      return new Promise((resolve) => {
        resolver = () => resolve({
          bodies: job.bodies,
          energyError: 1e-4,
          totalStepCount: job.initialStepCount + job.stepCount,
          simulationTime: (job.initialStepCount + job.stepCount) * Number(job.simulationConfig.timeStep),
          runId: job.runId,
          sequence: job.sequence,
          pipelineTimeMs: 2
        });
      });
    },
    dispose() {}
  });

  loop.prepareForStart();
  setPlaybackState(store, "running");
  loop.lastFrameTime = 0;
  loop.handleFrame(1000);
  loop.reset();
  resolver();
  await flushPromises();

  const state = store.getState();
  assert.equal(state.runtime.simulationTime, 0);
  assert.equal(state.runtime.metrics.pipelineTime, "--");
  assert.equal(state.runtime.executionNotice, "");
}

await testAccumulatorCapLimitsStepsPerFrame();
testPausedStateDoesNotAdvanceBodiesOrTime();
testFpsWindowUpdatesAfterThreshold();
await testEnergyReferenceResetsAndReinitializes();
testIdleStateDoesNotUpdateFpsMetric();
testInvalidTimeStepIsNoOp();
await testStaleAsyncResultsAreIgnoredAfterReset();

console.log("simulation-loop.test.mjs ok");