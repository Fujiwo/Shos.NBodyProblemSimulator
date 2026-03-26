// Encodes simulation jobs for main-thread or worker execution and rebuilds results from compact numeric buffers.

import { simulateBatch } from "./physics-engine.js";

export const BODY_STATE_STRIDE = 7;

const WORKER_SIMULATION_CONFIG_KEYS = [
  "gravitationalConstant",
  "timeStep",
  "softening",
  "integrator"
];

function defaultNow() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function createSimulationRequestKey(runId, sequence) {
  return `${runId}:${sequence}`;
}

export function encodeBodyStateBuffer(bodies) {
  const buffer = new Float64Array(bodies.length * BODY_STATE_STRIDE);

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    const offset = index * BODY_STATE_STRIDE;

    // Keep the worker payload flat so transfers only carry the numeric state needed to advance the simulation.
    buffer[offset] = body.mass;
    buffer[offset + 1] = body.position.x;
    buffer[offset + 2] = body.position.y;
    buffer[offset + 3] = body.position.z;
    buffer[offset + 4] = body.velocity.x;
    buffer[offset + 5] = body.velocity.y;
    buffer[offset + 6] = body.velocity.z;
  }

  return buffer;
}

export function decodeBodyStateBuffer(bodyStateBuffer, templateBodies = null) {
  const numericBuffer = bodyStateBuffer instanceof Float64Array
    ? bodyStateBuffer
    : new Float64Array(bodyStateBuffer);
  const bodyCount = Math.floor(numericBuffer.length / BODY_STATE_STRIDE);
  const bodies = [];

  for (let index = 0; index < bodyCount; index += 1) {
    const offset = index * BODY_STATE_STRIDE;
    const dynamicState = {
      mass: numericBuffer[offset],
      position: {
        x: numericBuffer[offset + 1],
        y: numericBuffer[offset + 2],
        z: numericBuffer[offset + 3]
      },
      velocity: {
        x: numericBuffer[offset + 4],
        y: numericBuffer[offset + 5],
        z: numericBuffer[offset + 6]
      }
    };

    if (templateBodies && templateBodies[index]) {
      // Restore stable metadata such as ids and colors from the original bodies while replacing dynamic state.
      bodies.push({
        ...templateBodies[index],
        ...dynamicState
      });
      continue;
    }

    bodies.push(dynamicState);
  }

  return bodies;
}

export function createWorkerSimulationConfig(simulationConfig) {
  const config = {};

  for (const key of WORKER_SIMULATION_CONFIG_KEYS) {
    config[key] = simulationConfig[key];
  }

  return config;
}

export function createWorkerSimulationConfigKey(simulationConfig) {
  return WORKER_SIMULATION_CONFIG_KEYS
    .map((key) => `${key}:${simulationConfig[key]}`)
    .join("|");
}

function createWorkerPayload(job) {
  return {
    bodyStateBuffer: encodeBodyStateBuffer(job.bodies).buffer,
    stepCount: job.stepCount,
    referenceEnergy: job.referenceEnergy,
    initialStepCount: job.initialStepCount,
    runId: job.runId,
    sequence: job.sequence
  };
}

export function createSimulationJob({
  appState,
  stepCount,
  referenceEnergy,
  initialStepCount,
  runId,
  sequence
}) {
  return {
    bodies: appState.bodies,
    simulationConfig: appState.simulationConfig,
    stepCount,
    referenceEnergy,
    initialStepCount,
    runId,
    sequence
  };
}

export function formatPipelineTime(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)} ms` : "--";
}

export function chooseExecutionMode({
  requestedMode = "auto",
  workerSupported = false
}) {
  if (requestedMode === "worker") {
    return workerSupported ? "worker" : "main";
  }

  if (requestedMode === "main") {
    return "main";
  }

  return "main";
}

export class MainThreadSimulationExecutor {
  constructor({ now = defaultNow } = {}) {
    this.mode = "main";
    this.now = now;
  }

  getStatus() {
    return {
      mode: this.mode,
      message: "Main-thread simulation backend ready."
    };
  }

  async submit(job) {
    const startedAt = this.now();
    const result = simulateBatch(job);
    const computeTimeMs = this.now() - startedAt;

    return {
      ...result,
      runId: job.runId,
      sequence: job.sequence,
      mode: this.mode,
      computeTimeMs,
      pipelineTimeMs: computeTimeMs
    };
  }

  dispose() {}
}

export class WorkerSimulationExecutor {
  constructor({ workerFactory, now = defaultNow } = {}) {
    this.mode = "worker";
    this.now = now;
    this.worker = workerFactory();
    this.pending = new Map();
    this.lastSimulationConfigKey = null;
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.worker.addEventListener("message", this.handleMessage);
    this.worker.addEventListener("error", this.handleError);
  }

  getStatus() {
    return {
      mode: this.mode,
      message: "Worker simulation backend ready."
    };
  }

  submit(job) {
    const requestKey = createSimulationRequestKey(job.runId, job.sequence);
    const startedAt = this.now();
    const payload = createWorkerPayload(job);
    const simulationConfigKey = createWorkerSimulationConfigKey(job.simulationConfig);

    return new Promise((resolve, reject) => {
      try {
        if (this.lastSimulationConfigKey !== simulationConfigKey) {
          // Sync worker-side integration parameters only when they change to avoid resending them with every batch.
          this.worker.postMessage({
            type: "sync-simulation-config",
            payload: {
              simulationConfig: createWorkerSimulationConfig(job.simulationConfig)
            }
          });
          this.lastSimulationConfigKey = simulationConfigKey;
        }

        this.pending.set(requestKey, {
          resolve,
          reject,
          startedAt,
          templateBodies: job.bodies
        });
        this.worker.postMessage({
          type: "simulate-batch",
          payload
        }, [payload.bodyStateBuffer]);
      } catch (error) {
        this.pending.delete(requestKey);
        this.lastSimulationConfigKey = null;
        reject(error);
      }
    });
  }

  handleMessage(event) {
    const message = event.data;

    if (!message || message.type !== "simulate-batch:result") {
      return;
    }

    const requestKey = createSimulationRequestKey(message.payload.runId, message.payload.sequence);
    const pending = this.pending.get(requestKey);

    if (!pending) {
      return;
    }

    this.pending.delete(requestKey);
    pending.resolve({
      ...message.payload,
      bodies: decodeBodyStateBuffer(message.payload.bodyStateBuffer, pending.templateBodies),
      mode: this.mode,
      pipelineTimeMs: this.now() - pending.startedAt
    });
  }

  handleError(error) {
    this.lastSimulationConfigKey = null;

    for (const pending of this.pending.values()) {
      pending.reject(error);
    }

    this.pending.clear();
  }

  dispose() {
    this.worker.removeEventListener("message", this.handleMessage);
    this.worker.removeEventListener("error", this.handleError);
    this.worker.terminate();
    this.pending.clear();
    this.lastSimulationConfigKey = null;
  }
}

export function createSimulationExecutor({ requestedMode = "auto", workerFactory, now = defaultNow } = {}) {
  const workerSupported = typeof workerFactory === "function" && typeof Worker !== "undefined";
  const selectedMode = chooseExecutionMode({ requestedMode, workerSupported });

  class ResilientSimulationExecutor {
    constructor(primaryExecutor, fallbackFactory) {
      this.executor = primaryExecutor;
      this.fallbackFactory = fallbackFactory;
      this.lastStatusMessage = primaryExecutor.getStatus().message;
      this.fallbackNotice = "";
    }

    getStatus() {
      return {
        mode: this.executor.mode,
        message: this.lastStatusMessage
      };
    }

    async submit(job) {
      try {
        const result = await this.executor.submit(job);
        return this.fallbackNotice
          ? {
              ...result,
              statusMessage: this.fallbackNotice
            }
          : result;
      } catch {
        if (this.executor.mode !== "worker") {
          throw new Error("Simulation execution failed.");
        }

        this.executor.dispose();
        this.executor = this.fallbackFactory();
        this.fallbackNotice = "Worker runtime error detected. Automatically switched to main-thread simulation.";
        this.lastStatusMessage = this.fallbackNotice;

        const retryResult = await this.executor.submit(job);

        return {
          ...retryResult,
          statusMessage: this.fallbackNotice
        };
      }
    }

    dispose() {
      this.executor.dispose();
    }
  }

  if (selectedMode === "worker") {
    try {
      return new ResilientSimulationExecutor(
        new WorkerSimulationExecutor({ workerFactory, now }),
        () => new MainThreadSimulationExecutor({ now })
      );
    } catch {
      const fallback = new MainThreadSimulationExecutor({ now });
      fallback.getStatus = () => ({
        mode: "main",
        message: "Worker backend unavailable. Falling back to main-thread simulation."
      });
      return fallback;
    }
  }

  return new MainThreadSimulationExecutor({ now });
}