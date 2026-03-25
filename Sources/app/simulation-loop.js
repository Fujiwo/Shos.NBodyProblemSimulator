import { computeTotalEnergy, stepVelocityVerlet } from "./physics-engine.js";

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
  constructor(store) {
    this.store = store;
    this.rafId = null;
    this.lastFrameTime = null;
    this.accumulator = 0;
    this.referenceEnergy = null;
    this.stepCount = 0;
    this.fpsWindowStart = null;
    this.framesInWindow = 0;
    this.handleFrame = this.handleFrame.bind(this);
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
  }

  prepareForStart() {
    this.accumulator = 0;
    this.lastFrameTime = null;
    this.stepCount = 0;
    this.framesInWindow = 0;
    this.fpsWindowStart = null;

    const state = this.store.getState();
    this.referenceEnergy = computeTotalEnergy(state.appState.bodies, state.appState.simulationConfig);
  }

  prepareForResume() {
    this.accumulator = 0;
    this.lastFrameTime = null;
  }

  prepareForPause() {
    this.accumulator = 0;
    this.lastFrameTime = null;
  }

  reset() {
    this.accumulator = 0;
    this.lastFrameTime = null;
    this.referenceEnergy = null;
    this.stepCount = 0;
    this.framesInWindow = 0;
    this.fpsWindowStart = null;
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

    this.accumulator -= stepCount * dt;

    this.store.update((model) => {
      if (model.appState.uiState.playbackState !== "running") {
        return;
      }

      if (!Number.isFinite(this.referenceEnergy)) {
        this.referenceEnergy = computeTotalEnergy(model.appState.bodies, model.appState.simulationConfig);
      }

      for (let index = 0; index < stepCount; index += 1) {
        stepVelocityVerlet(model.appState.bodies, model.appState.simulationConfig);
      }

      this.stepCount += stepCount;
      model.runtime.simulationTime = this.stepCount * dt;

      const totalEnergy = computeTotalEnergy(model.appState.bodies, model.appState.simulationConfig);
      const denominator = Math.max(Math.abs(this.referenceEnergy), 1e-12);
      const energyError = Math.abs(totalEnergy - this.referenceEnergy) / denominator;
      model.runtime.metrics.energyError = formatEnergyError(energyError);
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