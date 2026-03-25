import {
  clampBodyCount,
  clone,
  createBody,
  createCommittedInitialState,
  normalizeExpandedPanels
} from "./defaults.js";

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function setNestedValue(target, fieldPath, value) {
  const segments = fieldPath.split(".");
  let current = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    current = current[segments[index]];
  }

  current[segments[segments.length - 1]] = value;
}

export class SimulationController {
  constructor(store, persistence) {
    this.store = store;
    this.persistence = persistence;
  }

  getValidationErrors(appState) {
    const errors = [];

    if (!Number.isInteger(appState.bodyCount) || appState.bodyCount < 2 || appState.bodyCount > 10) {
      errors.push("Body count must be between 2 and 10.");
    }

    if (appState.bodies.length !== appState.bodyCount) {
      errors.push("Body count must match the number of configured body cards.");
    }

    for (const body of appState.bodies) {
      if (!body.name || body.name.trim().length < 1 || body.name.trim().length > 32) {
        errors.push(`${body.id}: Name must be between 1 and 32 characters.`);
      }

      if (!isFiniteNumber(body.mass) || Number(body.mass) <= 0) {
        errors.push(`${body.id}: Mass must be greater than 0.`);
      }

      for (const axis of ["x", "y", "z"]) {
        if (!isFiniteNumber(body.position[axis]) || !isFiniteNumber(body.velocity[axis])) {
          errors.push(`${body.id}: Position and velocity values must be finite numbers.`);
          break;
        }
      }

      if (!body.color) {
        errors.push(`${body.id}: Color is required.`);
      }
    }

    if (!isFiniteNumber(appState.simulationConfig.timeStep) || Number(appState.simulationConfig.timeStep) <= 0) {
      errors.push("Time Step must be greater than 0.");
    }

    if (!isFiniteNumber(appState.simulationConfig.softening) || Number(appState.simulationConfig.softening) < 0) {
      errors.push("Softening must be 0 or greater.");
    }

    return [...new Set(errors)];
  }

  mutateAppState(mutator, options = {}) {
    this.store.update((model) => {
      mutator(model.appState, model.runtime);

      model.runtime.validationErrors = this.getValidationErrors(model.appState);

      if (options.commitWhenIdle && model.appState.uiState.playbackState === "idle" && model.runtime.validationErrors.length === 0) {
        model.appState.committedInitialState = createCommittedInitialState(model.appState);
      }

      if (options.statusMessage) {
        model.runtime.statusMessage = options.statusMessage;
      }
    });

    this.persistence.stage(this.store.getState().appState);
  }

  setStatus(message) {
    this.store.update((model) => {
      model.runtime.statusMessage = message;
    });
  }

  updateBodyCount(value) {
    const nextBodyCount = clampBodyCount(value);

    this.mutateAppState((appState) => {
      const currentBodies = clone(appState.bodies);
      const nextBodies = currentBodies.slice(0, nextBodyCount);

      for (let index = nextBodies.length; index < nextBodyCount; index += 1) {
        nextBodies.push(createBody(index));
      }

      appState.bodyCount = nextBodyCount;
      appState.bodies = nextBodies;
      appState.uiState.expandedBodyPanels = normalizeExpandedPanels(appState.uiState.expandedBodyPanels, appState.bodies);
    }, {
      commitWhenIdle: true,
      statusMessage: "Body count scaffold updated. Phase 2 will add full validation and persistence."
    });
  }

  updateSimulationConfig(key, value) {
    this.mutateAppState((appState) => {
      appState.simulationConfig[key] = value;
    }, {
      commitWhenIdle: true
    });
  }

  updateShowTrails(checked) {
    this.mutateAppState((appState) => {
      appState.uiState.showTrails = checked;
    }, {
      commitWhenIdle: true
    });
  }

  updateBodyField(bodyId, fieldPath, rawValue) {
    this.mutateAppState((appState) => {
      const body = appState.bodies.find((entry) => entry.id === bodyId);

      if (!body) {
        return;
      }

      const numericFields = [
        "mass",
        "position.x",
        "position.y",
        "position.z",
        "velocity.x",
        "velocity.y",
        "velocity.z"
      ];

      const value = numericFields.includes(fieldPath) ? toNumber(rawValue, 0) : rawValue;
      setNestedValue(body, fieldPath, value);
    }, {
      commitWhenIdle: true
    });
  }

  toggleBodyPanel(bodyId, isOpen) {
    this.mutateAppState((appState) => {
      const expandedPanels = appState.uiState.expandedBodyPanels.filter((entry) => entry !== bodyId);

      if (isOpen) {
        expandedPanels.unshift(bodyId);
      }

      appState.uiState.expandedBodyPanels = normalizeExpandedPanels(expandedPanels, appState.bodies);
    });
  }

  start() {
    const { appState } = this.store.getState();
    const validationErrors = this.getValidationErrors(appState);

    if (validationErrors.length > 0) {
      this.setStatus("Resolve validation issues before starting the simulation scaffold.");
      return;
    }

    this.mutateAppState((nextAppState) => {
      nextAppState.uiState.playbackState = "running";
    }, {
      statusMessage: "Playback entered the running scaffold state. Physics integration arrives in Phase 3."
    });
  }

  pause() {
    this.mutateAppState((appState) => {
      if (appState.uiState.playbackState === "running") {
        appState.uiState.playbackState = "paused";
      }
    }, {
      statusMessage: "Playback paused. Resume wiring is active even before the physics loop exists."
    });
  }

  resume() {
    this.mutateAppState((appState) => {
      if (appState.uiState.playbackState === "paused") {
        appState.uiState.playbackState = "running";
      }
    }, {
      statusMessage: "Playback returned to the running scaffold state."
    });
  }

  reset() {
    this.mutateAppState((appState, runtime) => {
      const snapshot = appState.committedInitialState;

      if (!snapshot) {
        return;
      }

      appState.bodyCount = snapshot.bodyCount;
      appState.bodies = clone(snapshot.bodies);
      appState.simulationConfig = clone(snapshot.simulationConfig);
      appState.uiState.playbackState = "idle";
      appState.uiState.selectedBodyId = snapshot.uiState.selectedBodyId;
      appState.uiState.cameraTarget = snapshot.uiState.cameraTarget;
      appState.uiState.showTrails = snapshot.uiState.showTrails;
      appState.uiState.expandedBodyPanels = normalizeExpandedPanels(appState.uiState.expandedBodyPanels, appState.bodies);
      runtime.simulationTime = 0;
    }, {
      statusMessage: "Reset restored the committed initial scaffold state."
    });
  }

  generate() {
    this.mutateAppState((appState, runtime) => {
      appState.uiState.playbackState = "idle";
      appState.uiState.selectedBodyId = null;
      appState.uiState.cameraTarget = "system-center";
      runtime.simulationTime = 0;

      if (this.getValidationErrors(appState).length === 0) {
        appState.committedInitialState = createCommittedInitialState(appState);
      }
    }, {
      statusMessage: "Generate wiring is ready. Preset-driven body generation lands in Phase 5."
    });
  }
}