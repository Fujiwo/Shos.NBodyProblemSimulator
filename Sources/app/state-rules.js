import {
  APP_VERSION,
  clone,
  createBodies,
  createCommittedInitialState,
  createInitialAppState,
  createSimulationConfig,
  normalizeExpandedPanels
} from "./defaults.js";

const PRESET_RULES = {
  "binary-orbit": { min: 2, max: 2 },
  "three-body-figure-eight": { min: 3, max: 3 },
  "random-cluster": { min: 3, max: 10 }
};

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function toFiniteNumber(value, fallback) {
  return isFiniteNumber(value) ? Number(value) : fallback;
}

export function getPresetRule(presetId) {
  return PRESET_RULES[presetId] ?? PRESET_RULES["random-cluster"];
}

export function normalizePresetId(presetId) {
  return PRESET_RULES[presetId] ? presetId : "random-cluster";
}

export function normalizeBodyCountForPreset(presetId, bodyCount) {
  const rule = getPresetRule(presetId);
  const numeric = Number.parseInt(bodyCount, 10);
  const fallback = rule.min;
  const normalized = Number.isFinite(numeric) ? numeric : fallback;
  return Math.min(rule.max, Math.max(rule.min, normalized));
}

function normalizeBody(rawBody, index) {
  const fallbackBody = createBodies(index + 1)[index];
  const body = rawBody && typeof rawBody === "object" ? rawBody : {};

  return {
    id: typeof body.id === "string" && body.id.length > 0 ? body.id : fallbackBody.id,
    name: typeof body.name === "string" && body.name.length > 0 ? body.name : fallbackBody.name,
    mass: toFiniteNumber(body.mass, fallbackBody.mass),
    position: {
      x: toFiniteNumber(body.position?.x, fallbackBody.position.x),
      y: toFiniteNumber(body.position?.y, fallbackBody.position.y),
      z: toFiniteNumber(body.position?.z, fallbackBody.position.z)
    },
    velocity: {
      x: toFiniteNumber(body.velocity?.x, fallbackBody.velocity.x),
      y: toFiniteNumber(body.velocity?.y, fallbackBody.velocity.y),
      z: toFiniteNumber(body.velocity?.z, fallbackBody.velocity.z)
    },
    color: typeof body.color === "string" && body.color.length > 0 ? body.color : fallbackBody.color
  };
}

function normalizeBodies(rawBodies, bodyCount) {
  const bodies = Array.isArray(rawBodies) ? rawBodies : [];
  const nextBodies = createBodies(bodyCount);

  for (let index = 0; index < bodyCount; index += 1) {
    nextBodies[index] = normalizeBody(bodies[index], index);
  }

  return nextBodies;
}

function normalizeSimulationConfig(rawConfig) {
  const fallback = createSimulationConfig();
  const config = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
  const presetId = normalizePresetId(config.presetId ?? fallback.presetId);

  return {
    gravitationalConstant: toFiniteNumber(config.gravitationalConstant, fallback.gravitationalConstant),
    timeStep: toFiniteNumber(config.timeStep, fallback.timeStep),
    softening: toFiniteNumber(config.softening, fallback.softening),
    integrator: config.integrator === "velocity-verlet" || config.integrator === "rk4" ? config.integrator : fallback.integrator,
    maxTrailPoints: Number.isInteger(config.maxTrailPoints) && config.maxTrailPoints > 0 ? config.maxTrailPoints : fallback.maxTrailPoints,
    presetId,
    seed: config.seed === null || (Number.isInteger(config.seed) && config.seed >= 0) ? config.seed : fallback.seed
  };
}

function normalizeUiState(rawUiState, bodies) {
  const uiState = rawUiState && typeof rawUiState === "object" ? rawUiState : {};
  const bodyIds = new Set(bodies.map((body) => body.id));
  const selectedBodyId = bodyIds.has(uiState.selectedBodyId) ? uiState.selectedBodyId : null;
  const cameraTarget = uiState.cameraTarget === "system-center" || bodyIds.has(uiState.cameraTarget)
    ? uiState.cameraTarget
    : "system-center";

  return {
    playbackState: "idle",
    selectedBodyId,
    cameraTarget,
    showTrails: typeof uiState.showTrails === "boolean" ? uiState.showTrails : true,
    expandedBodyPanels: normalizeExpandedPanels(Array.isArray(uiState.expandedBodyPanels) ? uiState.expandedBodyPanels : [], bodies)
  };
}

function normalizeCommittedSnapshot(rawSnapshot, fallbackAppState) {
  if (!rawSnapshot || typeof rawSnapshot !== "object") {
    return createCommittedInitialState(fallbackAppState);
  }

  const simulationConfig = normalizeSimulationConfig(rawSnapshot.simulationConfig ?? fallbackAppState.simulationConfig);
  const bodyCount = normalizeBodyCountForPreset(
    simulationConfig.presetId,
    rawSnapshot.bodyCount ?? rawSnapshot.bodies?.length ?? fallbackAppState.bodyCount
  );
  const bodies = normalizeBodies(rawSnapshot.bodies, bodyCount);
  const bodyIds = new Set(bodies.map((body) => body.id));
  const snapshotUiState = rawSnapshot.uiState && typeof rawSnapshot.uiState === "object" ? rawSnapshot.uiState : {};

  return {
    bodyCount,
    bodies,
    simulationConfig,
    uiState: {
      selectedBodyId: bodyIds.has(snapshotUiState.selectedBodyId) ? snapshotUiState.selectedBodyId : null,
      cameraTarget: snapshotUiState.cameraTarget === "system-center" || bodyIds.has(snapshotUiState.cameraTarget)
        ? snapshotUiState.cameraTarget
        : "system-center",
      showTrails: typeof snapshotUiState.showTrails === "boolean" ? snapshotUiState.showTrails : fallbackAppState.uiState.showTrails
    }
  };
}

export function normalizeAppState(rawAppState) {
  const fallback = createInitialAppState();
  const input = rawAppState && typeof rawAppState === "object" ? rawAppState : {};
  const simulationConfig = normalizeSimulationConfig(input.simulationConfig);
  const requestedCount = input.bodyCount ?? input.bodies?.length ?? fallback.bodyCount;
  const bodyCount = normalizeBodyCountForPreset(simulationConfig.presetId, requestedCount);
  const bodies = normalizeBodies(input.bodies, bodyCount);

  const appState = {
    appVersion: typeof input.appVersion === "string" && input.appVersion.length > 0 ? input.appVersion : APP_VERSION,
    bodyCount,
    bodies,
    simulationConfig,
    uiState: normalizeUiState(input.uiState, bodies),
    committedInitialState: null,
    playbackRestorePolicy: "restore-as-idle"
  };

  appState.committedInitialState = normalizeCommittedSnapshot(input.committedInitialState, appState);

  return appState;
}

export function createHydratedAppState(rawAppState) {
  return normalizeAppState(clone(rawAppState));
}