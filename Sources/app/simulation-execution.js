import { simulateBatch } from "./physics-engine.js";

function defaultNow() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
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
    const requestKey = `${job.runId}:${job.sequence}`;
    const startedAt = this.now();

    return new Promise((resolve, reject) => {
      this.pending.set(requestKey, { resolve, reject, startedAt });
      try {
        this.worker.postMessage({
          type: "simulate-batch",
          payload: job
        });
      } catch (error) {
        this.pending.delete(requestKey);
        reject(error);
      }
    });
  }

  handleMessage(event) {
    const message = event.data;

    if (!message || message.type !== "simulate-batch:result") {
      return;
    }

    const requestKey = `${message.payload.runId}:${message.payload.sequence}`;
    const pending = this.pending.get(requestKey);

    if (!pending) {
      return;
    }

    this.pending.delete(requestKey);
    pending.resolve({
      ...message.payload,
      mode: this.mode,
      pipelineTimeMs: this.now() - pending.startedAt
    });
  }

  handleError(error) {
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
        return {
          ...result,
          statusMessage: this.lastStatusMessage
        };
      } catch {
        if (this.executor.mode !== "worker") {
          throw new Error("Simulation execution failed.");
        }

        this.executor.dispose();
        this.executor = this.fallbackFactory();
        this.lastStatusMessage = "Worker runtime error detected. Automatically switched to main-thread simulation.";

        const retryResult = await this.executor.submit(job);

        return {
          ...retryResult,
          statusMessage: this.lastStatusMessage
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