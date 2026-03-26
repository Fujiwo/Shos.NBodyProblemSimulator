import { syncTrailHistoryEntries } from "./renderer-helpers.js";

function createVector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function resolveSceneCameraTarget(appState) {
  const cameraTarget = appState.uiState.cameraTarget;

  if (cameraTarget && cameraTarget !== "system-center") {
    const targetBody = appState.bodies.find((body) => body.id === cameraTarget);

    if (targetBody) {
      return createVector(targetBody.position.x, targetBody.position.y, targetBody.position.z);
    }
  }

  if (appState.bodies.length === 0) {
    return createVector();
  }

  const weightedCenter = appState.bodies.reduce((accumulator, body) => {
    const mass = Number.isFinite(body.mass) && body.mass > 0 ? body.mass : 0;

    return {
      x: accumulator.x + (body.position.x * mass),
      y: accumulator.y + (body.position.y * mass),
      z: accumulator.z + (body.position.z * mass),
      totalMass: accumulator.totalMass + mass
    };
  }, {
    x: 0,
    y: 0,
    z: 0,
    totalMass: 0
  });

  if (weightedCenter.totalMass > 0) {
    return createVector(
      weightedCenter.x / weightedCenter.totalMass,
      weightedCenter.y / weightedCenter.totalMass,
      weightedCenter.z / weightedCenter.totalMass
    );
  }

  const center = appState.bodies.reduce((accumulator, body) => ({
    x: accumulator.x + body.position.x,
    y: accumulator.y + body.position.y,
    z: accumulator.z + body.position.z
  }), createVector());

  return createVector(
    center.x / appState.bodies.length,
    center.y / appState.bodies.length,
    center.z / appState.bodies.length
  );
}

export function resolveSceneCameraFrame(appState, simulationTime) {
  const target = resolveSceneCameraTarget(appState);

  return {
    target,
    position: {
      x: target.x + Math.sin(simulationTime * 0.18) * 0.2,
      y: target.y + 3.2,
      z: target.z + 8.2 + Math.cos(simulationTime * 0.14) * 0.15
    }
  };
}

export function buildSceneTrailPlan({ trailHistory, appState, simulationTime }) {
  const nextTrailHistory = syncTrailHistoryEntries({
    trailHistory,
    bodies: appState.bodies,
    showTrails: appState.uiState.showTrails,
    simulationTime,
    maxTrailPoints: appState.simulationConfig.maxTrailPoints,
    selectPoint: (body) => ({ x: body.position.x, y: body.position.y, z: body.position.z })
  });

  return {
    nextTrailHistory,
    shouldReset: nextTrailHistory.size === 0,
    removedBodyIds: [...trailHistory.keys()].filter((bodyId) => !nextTrailHistory.has(bodyId))
  };
}

export function createTrailPoints(history, createPoint) {
  return history.map((point) => createPoint(point.x, point.y, point.z));
}