import { DEFAULT_BODY_SEED_DATA } from "../data/default-bodies.js";
import { createCommittedInitialState } from "./committed-state.js";

export const APP_VERSION = "0.4.0-phase4";
export const STORAGE_KEY = "nbody-simulator.state";
export const PLAYBACK_RESTORE_POLICY = "restore-as-idle";

const BODY_COLORS = [
  "#52b7ff",
  "#ff9f68",
  "#8ad95b",
  "#ff5a82",
  "#c5a3ff",
  "#ffd55a",
  "#43d5c5",
  "#ff7f50",
  "#7dd3fc",
  "#f9a8d4"
];

const FALLBACK_BODY_NAMES = [
  "uranus",
  "neptune",
  "pluto",
  "ceres"
];

const BODY_LAYOUT = [
  { position: { x: -0.8, y: 0.0, z: 0.0 }, velocity: { x: 0.0, y: -0.16, z: 0.0 } },
  { position: { x: 0.8, y: 0.0, z: 0.0 }, velocity: { x: 0.0, y: 0.16, z: 0.0 } },
  { position: { x: 0.0, y: 0.7, z: 0.0 }, velocity: { x: -0.12, y: 0.0, z: 0.0 } },
  { position: { x: 0.0, y: -0.7, z: 0.0 }, velocity: { x: 0.12, y: 0.0, z: 0.0 } },
  { position: { x: -0.55, y: 0.55, z: 0.2 }, velocity: { x: 0.08, y: -0.08, z: 0.0 } },
  { position: { x: 0.55, y: -0.55, z: -0.2 }, velocity: { x: -0.08, y: 0.08, z: 0.0 } },
  { position: { x: -0.25, y: -0.9, z: 0.1 }, velocity: { x: 0.15, y: 0.02, z: 0.0 } },
  { position: { x: 0.25, y: 0.9, z: -0.1 }, velocity: { x: -0.15, y: -0.02, z: 0.0 } },
  { position: { x: -1.0, y: 0.22, z: -0.15 }, velocity: { x: 0.02, y: -0.11, z: 0.0 } },
  { position: { x: 1.0, y: -0.22, z: 0.15 }, velocity: { x: -0.02, y: 0.11, z: 0.0 } }
];

export function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export function formatPlaybackState(playbackState) {
  return playbackState.charAt(0).toUpperCase() + playbackState.slice(1);
}

export function clampBodyCount(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BODY_SEED_DATA.length;
  }

  return Math.min(10, Math.max(2, parsed));
}

export function createBody(index) {
  const seededBody = DEFAULT_BODY_SEED_DATA[index];
  const preset = BODY_LAYOUT[index % BODY_LAYOUT.length];
  const defaultName = seededBody?.name ?? FALLBACK_BODY_NAMES[index - DEFAULT_BODY_SEED_DATA.length] ?? `Body ${index + 1}`;

  return {
    id: `body-${index + 1}`,
    name: defaultName,
    mass: seededBody?.mass ?? 1,
    position: clone(seededBody?.position ?? preset.position),
    velocity: clone(seededBody?.velocity ?? preset.velocity),
    color: BODY_COLORS[index % BODY_COLORS.length]
  };
}

export function createBodies(bodyCount) {
  return Array.from({ length: bodyCount }, (_, index) => createBody(index));
}

export function createDefaultExpandedPanels(bodies) {
  return bodies.length > 0 ? [bodies[0].id] : [];
}

export function createSimulationConfig() {
  return {
    gravitationalConstant: 1.0,
    timeStep: 0.005,
    softening: 0.01,
    integrator: "velocity-verlet",
    maxTrailPoints: 300,
    presetId: "random-cluster",
    seed: 1001
  };
}

export function createUiState(bodies) {
  return {
    playbackState: "idle",
    selectedBodyId: null,
    cameraTarget: "system-center",
    showTrails: true,
    expandedBodyPanels: createDefaultExpandedPanels(bodies)
  };
}

export function createInitialAppState(bodyCount = DEFAULT_BODY_SEED_DATA.length) {
  const bodies = createBodies(bodyCount);

  const appState = {
    appVersion: APP_VERSION,
    bodyCount,
    bodies,
    simulationConfig: createSimulationConfig(),
    uiState: createUiState(bodies),
    committedInitialState: null,
    playbackRestorePolicy: PLAYBACK_RESTORE_POLICY
  };

  appState.committedInitialState = createCommittedInitialState(appState);

  return appState;
}

export function createInitialRuntimeState() {
  return {
    simulationTime: 0,
    metrics: {
      fps: "--",
      energyError: "--",
      pipelineTime: "--"
    },
    statusMessage: "Phase 4 runtime ready. Generate a preset or start the current committed initial state.",
    executionNotice: "",
    lifecycleNotice: "",
    lifecycleMetadata: null,
    validationErrors: [],
    fieldErrors: {},
    fieldDrafts: {}
  };
}

export function createInitialModel(appState = createInitialAppState()) {
  return {
    appState,
    runtime: createInitialRuntimeState()
  };
}