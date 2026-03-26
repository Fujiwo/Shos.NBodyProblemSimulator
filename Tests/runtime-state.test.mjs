import assert from "node:assert/strict";

import {
  applyExecutionResultToModel,
  resetRuntimeForIdle,
  resetRuntimeForStart,
  shouldApplyExecutionResult
} from "../Sources/app/runtime-state.js";
import { createInitialModel } from "../Sources/app/defaults.js";

function testResetRuntimeForStartSetsRunningMetricsBaseline() {
  const model = createInitialModel();
  model.runtime.metrics.fps = "8.0";
  model.runtime.metrics.energyError = "--";
  model.runtime.metrics.pipelineTime = "2.00 ms";
  model.runtime.simulationTime = 3;

  resetRuntimeForStart(model.runtime);

  assert.equal(model.runtime.simulationTime, 0);
  assert.equal(model.runtime.metrics.fps, "--");
  assert.equal(model.runtime.metrics.energyError, "0.00e+0");
  assert.equal(model.runtime.metrics.pipelineTime, "--");
}

function testResetRuntimeForIdleClearsDraftsWhenRequested() {
  const model = createInitialModel();
  model.runtime.metrics.fps = "8.0";
  model.runtime.metrics.energyError = "1.00e-2";
  model.runtime.metrics.pipelineTime = "2.00 ms";
  model.runtime.simulationTime = 3;
  model.runtime.fieldDrafts = { seed: "bad" };

  resetRuntimeForIdle(model.runtime, { clearFieldDrafts: true });

  assert.equal(model.runtime.simulationTime, 0);
  assert.equal(model.runtime.metrics.fps, "--");
  assert.equal(model.runtime.metrics.energyError, "--");
  assert.equal(model.runtime.metrics.pipelineTime, "--");
  assert.deepEqual(model.runtime.fieldDrafts, {});
}

function testExecutionResultHelpersRespectRunAndSequenceContract() {
  assert.equal(shouldApplyExecutionResult({ runId: 2, sequence: 3 }, { runId: 2, appliedSequence: 2 }), true);
  assert.equal(shouldApplyExecutionResult({ runId: 2, sequence: 2 }, { runId: 2, appliedSequence: 2 }), false);
  assert.equal(shouldApplyExecutionResult({ runId: 1, sequence: 9 }, { runId: 2, appliedSequence: 0 }), false);
}

function testApplyExecutionResultToModelMutatesRuntimeAndBodies() {
  const model = createInitialModel();
  const nextBodies = model.appState.bodies.map((body) => ({
    ...body,
    position: { ...body.position, x: body.position.x + 1 }
  }));

  applyExecutionResultToModel(model, {
    bodies: nextBodies,
    simulationTime: 1.25,
    energyError: 1e-4,
    pipelineTimeMs: 3.5,
    statusMessage: "Worker runtime error detected. Automatically switched to main-thread simulation."
  });

  assert.deepEqual(model.appState.bodies, nextBodies);
  assert.equal(model.runtime.simulationTime, 1.25);
  assert.equal(model.runtime.metrics.energyError, "1.00e-4");
  assert.equal(model.runtime.metrics.pipelineTime, "3.50 ms");
  assert.equal(model.runtime.executionNotice, "Worker runtime error detected. Automatically switched to main-thread simulation.");
}

testResetRuntimeForStartSetsRunningMetricsBaseline();
testResetRuntimeForIdleClearsDraftsWhenRequested();
testExecutionResultHelpersRespectRunAndSequenceContract();
testApplyExecutionResultToModelMutatesRuntimeAndBodies();

console.log("runtime-state.test.mjs ok");