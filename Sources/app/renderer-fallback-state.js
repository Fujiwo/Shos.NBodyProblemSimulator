// Maintains fallback-only trail history in plain data structures that mirror the current app model.

import { syncTrailHistoryEntries } from "./renderer-helpers.js";

export function createFallbackTrailHistory() {
  return new Map();
}

export function reduceFallbackTrailHistory(trailHistory, model) {
  const { appState, runtime } = model;

  return syncTrailHistoryEntries({
    trailHistory,
    bodies: appState.bodies,
    showTrails: appState.uiState.showTrails,
    simulationTime: runtime.simulationTime,
    maxTrailPoints: appState.simulationConfig.maxTrailPoints,
    selectPoint: (body) => ({ x: body.position.x, y: body.position.y, z: 0 })
  });
}