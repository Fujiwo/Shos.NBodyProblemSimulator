import { simulateBatch } from "../app/physics-engine.js";
import { decodeBodyStateBuffer, encodeBodyStateBuffer } from "../app/simulation-execution.js";

let activeSimulationConfig = null;

function now() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

self.addEventListener("message", (event) => {
  const message = event.data;

  if (message?.type === "sync-simulation-config") {
    activeSimulationConfig = message.payload?.simulationConfig ?? null;
    return;
  }

  if (!message || message.type !== "simulate-batch") {
    return;
  }

  const startedAt = now();
  const payload = message.payload;
  const simulationConfig = activeSimulationConfig ?? payload.simulationConfig;
  const result = simulateBatch({
    bodies: decodeBodyStateBuffer(payload.bodyStateBuffer),
    simulationConfig,
    stepCount: payload.stepCount,
    referenceEnergy: payload.referenceEnergy,
    initialStepCount: payload.initialStepCount
  });
  const resultBodyStateBuffer = encodeBodyStateBuffer(result.bodies).buffer;

  self.postMessage({
    type: "simulate-batch:result",
    payload: {
      totalEnergy: result.totalEnergy,
      energyError: result.energyError,
      totalStepCount: result.totalStepCount,
      simulationTime: result.simulationTime,
      bodyStateBuffer: resultBodyStateBuffer,
      runId: payload.runId,
      sequence: payload.sequence,
      computeTimeMs: now() - startedAt
    }
  }, [resultBodyStateBuffer]);
});