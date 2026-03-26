import { computeTotalEnergy } from "./physics-engine.js";
import { formatPipelineTime } from "./simulation-execution.js";

const MAX_STEPS_PER_FRAME = 4;
const MAX_FRAME_DELTA_SECONDS = 0.25;
const FPS_WINDOW_MS = 500;

function formatFps(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "--";
}

function formatEnergyError(value) {
  return Number.isFinite(value) ? value.toExponential(2) : "--";
}

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

  prepareForStart() {
    this.runId += 1;
    this.accumulator = 0;
    this.lastFrameTime = null;
    this.stepCount = 0;
    this.framesInWindow = 0;
    this.fpsWindowStart = null;
    this.requestSequence = 0;
    this.appliedSequence = 0;
    this.pendingRequest = null;

    const state = this.store.getState();
    this.referenceEnergy = computeTotalEnergy(state.appState.bodies, state.appState.simulationConfig);
  }

  prepareForResume() {
    this.runId += 1;
    this.accumulator = 0;
    this.lastFrameTime = null;
    this.requestSequence = 0;
    this.appliedSequence = 0;
    this.pendingRequest = null;
  }

  prepareForPause() {
    this.runId += 1;
    this.accumulator = 0;
    this.lastFrameTime = null;
    this.pendingRequest = null;
  }

  reset() {
    this.runId += 1;
    this.accumulator = 0;
    this.lastFrameTime = null;
    this.referenceEnergy = null;
    this.stepCount = 0;
    this.framesInWindow = 0;
    this.fpsWindowStart = null;
    this.requestSequence = 0;
    this.appliedSequence = 0;
    this.pendingRequest = null;
  }

  handleFrame(now) {
    this.rafId = null;
    this.rafId = requestAnimationFrame(this.handleFrame);

    const state = this.store.getState();
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

    this.pendingRequest = this.executionBackend.submit({
      bodies: state.appState.bodies,
      simulationConfig: state.appState.simulationConfig,
      stepCount,
      referenceEnergy: this.referenceEnergy,
      initialStepCount: this.stepCount,
      runId: this.runId,
      sequence
    });

    this.pendingRequest
      .then(this.handleExecutionResult)
      .catch(() => {
        this.pendingRequest = null;
      });
  }

  handleExecutionResult(result) {
    this.pendingRequest = null;

    if (result.runId !== this.runId || result.sequence <= this.appliedSequence) {
      return;
    }

    this.appliedSequence = result.sequence;
    this.stepCount = result.totalStepCount;

    this.store.update((model) => {
      if (model.appState.uiState.playbackState !== "running") {
        return;
      }

      model.appState.bodies = result.bodies;
      model.runtime.simulationTime = result.simulationTime;
      model.runtime.metrics.energyError = formatEnergyError(result.energyError);
      model.runtime.metrics.pipelineTime = formatPipelineTime(result.pipelineTimeMs);

      if (result.statusMessage) {
        model.runtime.statusMessage = result.statusMessage;
      }
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