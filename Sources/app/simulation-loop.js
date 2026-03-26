// Owns the requestAnimationFrame loop, simulation step budgeting, and execution result application.

import { computeTotalEnergy } from "./physics-engine.js";
import { createSimulationJob, formatPipelineTime } from "./simulation-execution.js";
import { applyExecutionResultToModel, formatFps, shouldApplyExecutionResult } from "./runtime-state.js";

const MAX_STEPS_PER_FRAME = 4;
const MAX_FRAME_DELTA_SECONDS = 0.25;
const FPS_WINDOW_MS = 500;

export class SimulationLoop {
  constructor(store, executionBackend, options = {}) {
    this.store = store;
    this.executionBackend = executionBackend;
    this.rafId = null;
    this.lastFrameTime = null;
    this.accumulator = 0;
    this.referenceEnergy = null;
    this.stepCount = 0;
    this.fpsWindowStart = null;
    this.framesInWindow = 0;
    this.runId = 0;
    this.requestSequence = 0;
    this.appliedSequence = 0;
    this.pendingRequest = null;
    this.now = options.now ?? ((value) => value);
    this.handleFrame = this.handleFrame.bind(this);
    this.handleExecutionResult = this.handleExecutionResult.bind(this);
  }

  transitionRunSession({ appState = null, clearReferenceEnergy = false, clearProgress = false } = {}) {
    this.runId += 1;
    this.accumulator = 0;
    this.lastFrameTime = null;
    this.requestSequence = 0;
    this.appliedSequence = 0;
    this.pendingRequest = null;

    if (clearProgress) {
      this.stepCount = 0;
      this.framesInWindow = 0;
      this.fpsWindowStart = null;
    }

    if (clearReferenceEnergy) {
      this.referenceEnergy = null;
    } else if (appState) {
      this.referenceEnergy = computeTotalEnergy(appState.bodies, appState.simulationConfig);
    }
  }

  start() {
    if (this.rafId !== null) {
      return;
    }

    this.rafId = requestAnimationFrame(this.handleFrame);
  }

  dispose() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.executionBackend?.dispose?.();
  }

  startRun(appState) {
    this.transitionRunSession({
      appState,
      clearProgress: true
    });
  }

  resumeRun() {
    this.transitionRunSession();
  }

  pauseRun() {
    this.transitionRunSession();
  }

  resetRun() {
    this.transitionRunSession({
      clearReferenceEnergy: true,
      clearProgress: true
    });
  }

  handleFrame(now) {
    this.rafId = null;
    this.rafId = requestAnimationFrame(this.handleFrame);

    const state = this.store.getStateReference();
    const playbackState = state.appState.uiState.playbackState;

    if (playbackState !== "idle") {
      this.updateFps(now);
    }

    if (playbackState !== "running") {
      this.lastFrameTime = now;
      return;
    }

    if (this.lastFrameTime === null) {
      this.lastFrameTime = now;
      return;
    }

    const frameDeltaSeconds = Math.min(
      MAX_FRAME_DELTA_SECONDS,
      Math.max(0, (now - this.lastFrameTime) / 1000)
    );

    this.lastFrameTime = now;
    this.accumulator += frameDeltaSeconds;

    const dt = Number(state.appState.simulationConfig.timeStep);

    if (!Number.isFinite(dt) || dt <= 0) {
      return;
    }

    // Cap catch-up work so a long frame does not explode into an unbounded number of simulation steps.
    const stepCount = Math.min(MAX_STEPS_PER_FRAME, Math.floor(this.accumulator / dt));

    if (stepCount <= 0) {
      return;
    }

    if (this.pendingRequest !== null) {
      return;
    }

    if (!Number.isFinite(this.referenceEnergy)) {
      this.referenceEnergy = computeTotalEnergy(state.appState.bodies, state.appState.simulationConfig);
    }

    this.accumulator -= stepCount * dt;

    const sequence = this.requestSequence + 1;
    this.requestSequence = sequence;

    this.pendingRequest = this.executionBackend.submit(createSimulationJob({
      appState: state.appState,
      stepCount,
      referenceEnergy: this.referenceEnergy,
      initialStepCount: this.stepCount,
      runId: this.runId,
      sequence
    }));

    this.pendingRequest
      .then(this.handleExecutionResult)
      .catch(() => {
        this.pendingRequest = null;
      });
  }

  handleExecutionResult(result) {
    this.pendingRequest = null;

    // Ignore stale worker results after a pause, reset, or newer request has advanced the active run session.
    if (!shouldApplyExecutionResult(result, {
      runId: this.runId,
      appliedSequence: this.appliedSequence
    })) {
      return;
    }

    this.appliedSequence = result.sequence;
    this.stepCount = result.totalStepCount;

    this.store.update((model) => {
      if (model.appState.uiState.playbackState !== "running") {
        return;
      }

      applyExecutionResultToModel(model, result);
    });
  }

  updateFps(now) {
    this.framesInWindow += 1;

    if (this.fpsWindowStart === null) {
      this.fpsWindowStart = now;
      return;
    }

    const elapsed = now - this.fpsWindowStart;

    if (elapsed < FPS_WINDOW_MS) {
      return;
    }

    const fps = (this.framesInWindow * 1000) / elapsed;

    this.store.update((model) => {
      model.runtime.metrics.fps = formatFps(fps);
    });

    this.fpsWindowStart = now;
    this.framesInWindow = 0;
  }
}