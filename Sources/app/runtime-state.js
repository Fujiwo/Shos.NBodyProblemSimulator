import { formatPipelineTime } from "./simulation-execution.js";

export function formatFps(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "--";
}

export function formatEnergyError(value) {
  return Number.isFinite(value) ? value.toExponential(2) : "--";
}

export function resetRuntimeForStart(runtime) {
  runtime.simulationTime = 0;
  runtime.metrics.fps = "--";
  runtime.metrics.energyError = "0.00e+0";
  runtime.metrics.pipelineTime = "--";
}

export function resetRuntimeForIdle(runtime, options = {}) {
  runtime.simulationTime = 0;
  runtime.metrics.fps = "--";
  runtime.metrics.energyError = "--";
  runtime.metrics.pipelineTime = "--";

  if (options.clearFieldDrafts) {
    runtime.fieldDrafts = {};
  }
}

export function shouldApplyExecutionResult(result, state) {
  return result.runId === state.runId && result.sequence > state.appliedSequence;
}

export function applyExecutionResultToModel(model, result) {
  model.appState.bodies = result.bodies;
  model.runtime.simulationTime = result.simulationTime;
  model.runtime.metrics.energyError = formatEnergyError(result.energyError);
  model.runtime.metrics.pipelineTime = formatPipelineTime(result.pipelineTimeMs);

  if (result.statusMessage) {
    model.runtime.executionNotice = result.statusMessage;
  }
}