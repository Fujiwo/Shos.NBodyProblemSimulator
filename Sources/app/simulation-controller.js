import {
  clone,
  createDefaultExpandedPanels
} from "./defaults.js";
import { normalizePresetBodyCollection } from "./body-collection.js";
import { createCommittedInitialState, restoreCommittedInitialState } from "./committed-state.js";
import { generatePresetBodies } from "./preset-generator.js";
import { resetRuntimeForIdle, resetRuntimeForStart } from "./runtime-state.js";
import { getPresetRule, normalizeBodyCountForPreset, normalizeExpandedPanels } from "./state-rules.js";

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function isValidSeedValue(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 4294967295;
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

function getBodyFieldKey(bodyId, fieldPath) {
  return `body:${bodyId}:${fieldPath}`;
}

export class SimulationController {
  constructor(store, persistence) {
    this.store = store;
    this.persistence = persistence;
    this.loop = null;
  }

  attachLoop(loop) {
    this.loop = loop;
  }

  computeValidation(appState, fieldDrafts = {}) {
    const fieldErrors = {};

    const bodyCountRule = getPresetRule(appState.simulationConfig.presetId);

    if (!Number.isInteger(appState.bodyCount) || appState.bodyCount < 2 || appState.bodyCount > 10) {
      fieldErrors.bodyCount = "Body count must be between 2 and 10.";
    } else if (appState.bodyCount < bodyCountRule.min || appState.bodyCount > bodyCountRule.max) {
      fieldErrors.bodyCount = `${appState.simulationConfig.presetId} requires ${bodyCountRule.min === bodyCountRule.max ? bodyCountRule.min : `${bodyCountRule.min} to ${bodyCountRule.max}`} bodies.`;
    }

    if (appState.bodies.length !== appState.bodyCount) {
      fieldErrors.bodyCount = "Body count must match the number of configured body cards.";
    }

    for (const body of appState.bodies) {
      if (!body.name || body.name.trim().length < 1 || body.name.trim().length > 32) {
        fieldErrors[getBodyFieldKey(body.id, "name")] = "Name must be between 1 and 32 characters.";
      }

      if (!isFiniteNumber(body.mass) || Number(body.mass) <= 0) {
        fieldErrors[getBodyFieldKey(body.id, "mass")] = "Mass must be greater than 0.";
      }

      for (const axis of ["x", "y", "z"]) {
        if (!isFiniteNumber(body.position[axis]) || !isFiniteNumber(body.velocity[axis])) {
          if (!isFiniteNumber(body.position[axis])) {
            fieldErrors[getBodyFieldKey(body.id, `position.${axis}`)] = "Value must be a finite number.";
          }

          if (!isFiniteNumber(body.velocity[axis])) {
            fieldErrors[getBodyFieldKey(body.id, `velocity.${axis}`)] = "Value must be a finite number.";
          }
        }
      }

      if (!body.color) {
        fieldErrors[getBodyFieldKey(body.id, "color")] = "Color is required.";
      }
    }

    if (!isFiniteNumber(appState.simulationConfig.timeStep) || Number(appState.simulationConfig.timeStep) <= 0) {
      fieldErrors.timeStep = "Time Step must be greater than 0.";
    }

    if (!isFiniteNumber(appState.simulationConfig.softening) || Number(appState.simulationConfig.softening) < 0) {
      fieldErrors.softening = "Softening must be 0 or greater.";
    }

    if (appState.simulationConfig.integrator !== "velocity-verlet" && appState.simulationConfig.integrator !== "rk4") {
      fieldErrors.integrator = "Integrator must be Velocity Verlet or RK4.";
    }

    if (appState.simulationConfig.presetId === "random-cluster") {
      const seed = appState.simulationConfig.seed;

      if (!isValidSeedValue(seed)) {
        fieldErrors.seed = "Seed must be a 32-bit unsigned integer for random-cluster.";
      }
    }

    for (const [key, rawValue] of Object.entries(fieldDrafts)) {
      if (key === "timeStep") {
        if (!isFiniteNumber(rawValue) || Number(rawValue) <= 0) {
          fieldErrors.timeStep = "Time Step must be greater than 0.";
        }
      } else if (key === "softening") {
        if (!isFiniteNumber(rawValue) || Number(rawValue) < 0) {
          fieldErrors.softening = "Softening must be 0 or greater.";
        }
      } else if (key === "seed") {
        if (appState.simulationConfig.presetId === "random-cluster") {
          if (rawValue !== "" && !isValidSeedValue(rawValue)) {
            fieldErrors.seed = "Seed must be a 32-bit unsigned integer for random-cluster.";
          }
        }
      } else if (key.startsWith("body:")) {
        const [, , fieldPath] = key.split(":");

        if (fieldPath === "name" && (!rawValue || String(rawValue).trim().length < 1 || String(rawValue).trim().length > 32)) {
          fieldErrors[key] = "Name must be between 1 and 32 characters.";
        } else if (fieldPath === "color" && !rawValue) {
          fieldErrors[key] = "Color is required.";
        } else if (fieldPath === "mass") {
          if (!isFiniteNumber(rawValue) || Number(rawValue) <= 0) {
            fieldErrors[key] = "Mass must be greater than 0.";
          }
        } else if (fieldPath.startsWith("position.") || fieldPath.startsWith("velocity.")) {
          if (!isFiniteNumber(rawValue)) {
            fieldErrors[key] = "Value must be a finite number.";
          }
        }
      }
    }

    return {
      fieldErrors,
      validationErrors: [...new Set(Object.values(fieldErrors))]
    };
  }

  mutateAppState(mutator, options = {}) {
    this.store.update((model) => {
      mutator(model.appState, model.runtime);

      const validation = this.computeValidation(model.appState, model.runtime.fieldDrafts);
      model.runtime.fieldErrors = validation.fieldErrors;
      model.runtime.validationErrors = validation.validationErrors;

      if (options.commitWhenIdle && model.appState.uiState.playbackState === "idle" && model.runtime.validationErrors.length === 0) {
        model.appState.committedInitialState = createCommittedInitialState(model.appState);
      }

      if (options.statusMessage) {
        model.runtime.statusMessage = options.statusMessage;
      }
    });

    if (options.shouldPersist !== false) {
      this.persistence.stage(this.store.getStateReference().appState);
    }
  }

  refreshValidation() {
    this.mutateAppState(() => {}, {
      shouldPersist: false
    });
  }

  setStatus(message) {
    this.store.update((model) => {
      model.runtime.statusMessage = message;
    });
  }

  updateBodyCount(value) {
    const currentState = this.store.getStateReference();
    const presetId = currentState.appState.simulationConfig.presetId;
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed < 2 || parsed > 10) {
      this.mutateAppState((appState, runtime) => {
        runtime.fieldDrafts.bodyCount = undefined;
      }, {
        shouldPersist: false,
        statusMessage: "Body count reverted to the last valid value."
      });
      return;
    }

    const nextBodyCount = normalizeBodyCountForPreset(presetId, parsed);

    this.mutateAppState((appState, runtime) => {
      const normalizedCollection = normalizePresetBodyCollection({
        presetId,
        bodyCount: nextBodyCount,
        bodies: appState.bodies,
        uiState: appState.uiState,
        fieldDrafts: runtime.fieldDrafts
      });

      appState.bodyCount = normalizedCollection.bodyCount;
      appState.bodies = normalizedCollection.bodies;
      appState.uiState = normalizedCollection.uiState;
      runtime.fieldDrafts = normalizedCollection.fieldDrafts;
    }, {
      commitWhenIdle: true,
      statusMessage: nextBodyCount !== parsed
        ? `${presetId} body count was normalized to match the selected preset.`
        : "Body count updated."
    });
  }

  updateSimulationConfig(key, rawValue) {
    if (key === "presetId") {
      this.mutateAppState((appState, runtime) => {
        appState.simulationConfig[key] = rawValue;
        if (appState.simulationConfig.presetId !== "random-cluster") {
          appState.simulationConfig.seed = null;
        }
        const normalizedCollection = normalizePresetBodyCollection({
          presetId: appState.simulationConfig.presetId,
          bodyCount: appState.bodyCount,
          bodies: appState.bodies,
          uiState: appState.uiState,
          fieldDrafts: runtime.fieldDrafts
        });

        appState.bodyCount = normalizedCollection.bodyCount;
        appState.bodies = normalizedCollection.bodies;
        appState.uiState = normalizedCollection.uiState;
        runtime.fieldDrafts = normalizedCollection.fieldDrafts;
        delete runtime.fieldDrafts.bodyCount;
        if (appState.simulationConfig.presetId !== "random-cluster") {
          delete runtime.fieldDrafts.seed;
        }
        runtime.statusMessage = `${appState.simulationConfig.presetId} selected. Body count is ${normalizedCollection.bodyCount}.`;
      }, {
        commitWhenIdle: true
      });
      return;
    }

    if (key === "timeStep" || key === "softening" || key === "seed") {
      if (key === "seed" && rawValue === "") {
        const isRandomCluster = this.store.getStateReference().appState.simulationConfig.presetId === "random-cluster";

        this.mutateAppState((appState, runtime) => {
          if (isRandomCluster) {
            runtime.fieldDrafts.seed = "";
            return;
          }

          appState.simulationConfig.seed = null;
          delete runtime.fieldDrafts.seed;
        }, {
          commitWhenIdle: !isRandomCluster,
          shouldPersist: !isRandomCluster
        });
        return;
      }

      const fieldKey = key;
      const isSeedOptional = key === "seed" && this.store.getStateReference().appState.simulationConfig.presetId !== "random-cluster" && rawValue === "";
      const isValidNumber = rawValue !== "" && isFiniteNumber(rawValue);
      const parsedValue = rawValue === "" ? null : Number(rawValue);

      if (isSeedOptional || (key === "seed" ? isValidSeedValue(parsedValue) : isValidNumber && (key !== "timeStep" || parsedValue > 0) && (key !== "softening" || parsedValue >= 0))) {
        this.mutateAppState((appState, runtime) => {
          appState.simulationConfig[key] = parsedValue;
          delete runtime.fieldDrafts[fieldKey];
        }, {
          commitWhenIdle: true
        });
        return;
      }

      this.mutateAppState((appState, runtime) => {
        runtime.fieldDrafts[fieldKey] = rawValue;
      }, {
        shouldPersist: false
      });
      return;
    }

    this.mutateAppState((appState) => {
      appState.simulationConfig[key] = rawValue;
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

  updateCameraTarget(cameraTarget) {
    this.mutateAppState((appState) => {
      const isValidTarget = cameraTarget === "system-center"
        || appState.bodies.some((body) => body.id === cameraTarget);

      appState.uiState.cameraTarget = isValidTarget ? cameraTarget : "system-center";
    }, {
      commitWhenIdle: true
    });
  }

  updateSelectedBody(bodyId) {
    this.mutateAppState((appState) => {
      appState.uiState.selectedBodyId = appState.bodies.some((body) => body.id === bodyId)
        ? bodyId
        : null;
    }, {
      commitWhenIdle: true,
      shouldPersist: true
    });
  }

  updateBodyField(bodyId, fieldPath, rawValue) {
    const fieldKey = getBodyFieldKey(bodyId, fieldPath);
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

      if (numericFields.includes(fieldPath)) {
        if (rawValue === "" || !isFiniteNumber(rawValue)) {
          return;
        }

        setNestedValue(body, fieldPath, toNumber(rawValue, 0));
        return;
      }

      if (fieldPath === "name") {
        if (rawValue === "") {
          return;
        }

        setNestedValue(body, fieldPath, rawValue);
        return;
      }

      if (fieldPath === "color") {
        if (rawValue === "") {
          return;
        }

        setNestedValue(body, fieldPath, rawValue);
      }
    }, {
      commitWhenIdle: rawValue !== "" && (fieldPath === "name" ? rawValue.trim().length >= 1 && rawValue.trim().length <= 32 : true),
      shouldPersist: rawValue !== "" && (!fieldPath.startsWith("position.") && !fieldPath.startsWith("velocity.") ? true : isFiniteNumber(rawValue))
    });

    const isNumericField = [
      "mass",
      "position.x",
      "position.y",
      "position.z",
      "velocity.x",
      "velocity.y",
      "velocity.z"
    ].includes(fieldPath);

    const isValid = isNumericField
      ? rawValue !== "" && isFiniteNumber(rawValue)
      : fieldPath === "name"
        ? rawValue.trim().length >= 1 && rawValue.trim().length <= 32
        : rawValue !== "";

    this.mutateAppState((appState, runtime) => {
      if (isValid) {
        delete runtime.fieldDrafts[fieldKey];
        return;
      }

      runtime.fieldDrafts[fieldKey] = rawValue;
    }, {
      shouldPersist: false
    });
  }

  toggleBodyPanel(bodyId, isOpen) {
    this.mutateAppState((appState) => {
      const expandedPanels = appState.uiState.expandedBodyPanels.filter((entry) => entry !== bodyId);

      if (isOpen) {
        expandedPanels.push(bodyId);
        appState.uiState.selectedBodyId = appState.bodies.some((body) => body.id === bodyId)
          ? bodyId
          : appState.uiState.selectedBodyId;
      }

      appState.uiState.expandedBodyPanels = normalizeExpandedPanels(expandedPanels, appState.bodies);
    });
  }

  start() {
    const { appState, runtime } = this.store.getStateReference();
    const validationErrors = this.computeValidation(appState, runtime.fieldDrafts).validationErrors;

    if (appState.uiState.playbackState !== "idle") {
      this.setStatus(
        appState.uiState.playbackState === "paused"
          ? "Use Resume to continue or Reset to restart from the committed initial state."
          : "Simulation is already running. Pause or Reset before starting again."
      );
      return;
    }

    if (validationErrors.length > 0) {
      this.setStatus("Resolve validation issues before starting the simulation.");
      return;
    }

    let didStart = false;

    this.mutateAppState((nextAppState, nextRuntime) => {
      const snapshot = nextAppState.committedInitialState;

      if (!snapshot) {
        return;
      }

      didStart = true;
      const expandedBodyPanels = nextAppState.uiState.expandedBodyPanels.length > 0
        ? normalizeExpandedPanels(nextAppState.uiState.expandedBodyPanels, snapshot.bodies)
        : createDefaultExpandedPanels(snapshot.bodies);
      const restoredAppState = restoreCommittedInitialState(snapshot, {
        playbackState: "running",
        expandedBodyPanels
      });

      nextAppState.bodyCount = restoredAppState.bodyCount;
      nextAppState.bodies = restoredAppState.bodies;
      nextAppState.simulationConfig = restoredAppState.simulationConfig;
      nextAppState.uiState = {
        ...nextAppState.uiState,
        ...restoredAppState.uiState
      };
      resetRuntimeForStart(nextRuntime);
    }, {
      shouldPersist: false,
      statusMessage: "Simulation running."
    });

    if (!didStart) {
      this.setStatus("Committed initial state is unavailable. Generate or edit a valid idle state first.");
      return;
    }

    this.loop?.startRun(this.store.getStateReference().appState);
  }

  pause() {
    let didPause = false;

    this.mutateAppState((appState) => {
      if (appState.uiState.playbackState === "running") {
        appState.uiState.playbackState = "paused";
        didPause = true;
      }
    }, {
      shouldPersist: false,
      statusMessage: "Simulation paused."
    });

    if (didPause) {
      this.loop?.pauseRun();
    }
  }

  resume() {
    let didResume = false;

    this.mutateAppState((appState) => {
      if (appState.uiState.playbackState === "paused") {
        appState.uiState.playbackState = "running";
        didResume = true;
      }
    }, {
      shouldPersist: false,
      statusMessage: "Simulation resumed from the paused state."
    });

    if (didResume) {
      this.loop?.resumeRun();
    }
  }

  reset() {
    const { appState } = this.store.getStateReference();

    if (!appState.committedInitialState) {
      this.setStatus("No committed initial state is available for reset.");
      return;
    }

    this.mutateAppState((appState, runtime) => {
      const snapshot = appState.committedInitialState;

      if (!snapshot) {
        return;
      }

      const restoredAppState = restoreCommittedInitialState(snapshot, {
        playbackState: "idle",
        expandedBodyPanels: createDefaultExpandedPanels(snapshot.bodies)
      });

      appState.bodyCount = restoredAppState.bodyCount;
      appState.bodies = restoredAppState.bodies;
      appState.simulationConfig = restoredAppState.simulationConfig;
      appState.uiState = {
        ...appState.uiState,
        ...restoredAppState.uiState
      };
      resetRuntimeForIdle(runtime, { clearFieldDrafts: true });
    }, {
      statusMessage: "Reset restored the committed initial state."
    });

    this.loop?.resetRun();
  }

  generate() {
    const { appState, runtime } = this.store.getStateReference();

    if (appState.simulationConfig.presetId === "random-cluster" && runtime.fieldDrafts.seed !== undefined && runtime.fieldDrafts.seed !== "") {
      this.setStatus("Resolve the Seed field before generating random-cluster.");
      return;
    }

    this.mutateAppState((appState, runtime) => {
      const generation = generatePresetBodies({
        presetId: appState.simulationConfig.presetId,
        bodyCount: appState.bodyCount,
        seed: runtime.fieldDrafts.seed === "" ? null : appState.simulationConfig.seed
      });

      appState.bodyCount = generation.bodyCount;
      appState.bodies = generation.bodies;
      appState.simulationConfig.presetId = generation.presetId;
      appState.simulationConfig.seed = generation.seed;
      appState.uiState.playbackState = "idle";
      appState.uiState.selectedBodyId = null;
      appState.uiState.cameraTarget = "system-center";
      appState.uiState.expandedBodyPanels = createDefaultExpandedPanels(appState.bodies);
      resetRuntimeForIdle(runtime, { clearFieldDrafts: true });
      runtime.statusMessage = generation.presetId === "random-cluster"
        ? `Random cluster generated with seed ${generation.seed}.`
        : `Preset initial conditions generated for ${generation.presetId}.`;

      if (this.computeValidation(appState, runtime.fieldDrafts).validationErrors.length === 0) {
        appState.committedInitialState = createCommittedInitialState(appState);
      }
    });

    this.loop?.resetRun();
  }
}