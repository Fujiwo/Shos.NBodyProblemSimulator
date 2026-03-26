import { simulateBatch } from "../app/physics-engine.js";
import { decodeBodyStateBuffer, encodeBodyStateBuffer } from "../app/simulation-execution.js";

function now() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

self.addEventListener("message", (event) => {
  const message = event.data;

  if (!message || message.type !== "simulate-batch") {
    return;
  }

  const startedAt = now();
  const payload = message.payload;
  const result = simulateBatch({
    bodies: decodeBodyStateBuffer(payload.bodyStateBuffer),
    simulationConfig: payload.simulationConfig,
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