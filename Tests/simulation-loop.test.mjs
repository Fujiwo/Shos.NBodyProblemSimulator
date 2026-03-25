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
  const loop = new SimulationLoop(store);
  return { store, loop };
}

function setPlaybackState(store, playbackState) {
  store.update((model) => {
    model.appState.uiState.playbackState = playbackState;
  });
}

function testAccumulatorCapLimitsStepsPerFrame() {
  const { store, loop } = createLoopHarness();

  loop.prepareForStart();
  setPlaybackState(store, "running");
  loop.lastFrameTime = 0;

  loop.handleFrame(1000);

  const state = store.getState();

  assert.equal(loop.stepCount, 4);
  assert.equal(state.runtime.simulationTime, 0.02);
  assert.ok(Math.abs(loop.accumulator - 0.23) < 1e-12);
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

  const state = store.getState();
  assert.ok(Number.isFinite(loop.referenceEnergy));
  assert.notEqual(state.runtime.metrics.energyError, "--");
}

testAccumulatorCapLimitsStepsPerFrame();
testPausedStateDoesNotAdvanceBodiesOrTime();
testFpsWindowUpdatesAfterThreshold();
testEnergyReferenceResetsAndReinitializes();

console.log("simulation-loop.test.mjs ok");