import { simulateBatch } from "../app/physics-engine.js";

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
  const result = simulateBatch(payload);

  self.postMessage({
    type: "simulate-batch:result",
    payload: {
      ...result,
      runId: payload.runId,
      sequence: payload.sequence,
      computeTimeMs: now() - startedAt
    }
  });
});