import assert from "node:assert/strict";

import { AppStore } from "../Sources/app/app-store.js";
import { createInitialModel } from "../Sources/app/defaults.js";
import { SimulationLoop } from "../Sources/app/simulation-loop.js";

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

testAccumulatorCapLimitsStepsPerFrame();
testPausedStateDoesNotAdvanceBodiesOrTime();

console.log("simulation-loop.test.mjs ok");