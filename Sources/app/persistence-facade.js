import { STORAGE_KEY, clone, createInitialAppState } from "./defaults.js";
import { createHydratedAppState } from "./state-rules.js";

export class PersistenceFacade {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.lastSerializedState = null;
  }

  load() {
    const fallbackAppState = createInitialAppState();
    const storage = this.getStorage();

    if (!storage) {
      return {
        appState: fallbackAppState,
        statusMessage: null
      };
    }

    try {
      const rawValue = storage.getItem(this.storageKey);

      if (!rawValue) {
        return {
          appState: fallbackAppState,
          statusMessage: null
        };
      }

      const parsed = JSON.parse(rawValue);

      return {
        appState: createHydratedAppState(parsed),
        statusMessage: "Saved state restored."
      };
    } catch {
      return {
        appState: fallbackAppState,
        statusMessage: "Failed to restore saved state. Defaults were applied."
      };
    }
  }

  stage(appState) {
    this.lastSerializedState = this.serialize(appState);

    const storage = this.getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(this.storageKey, JSON.stringify(this.lastSerializedState));
    } catch {
      // Ignore storage failures for now. Phase 2 only guarantees a safe persistence boundary.
    }
  }

  serialize(appState) {
    return clone({
      appVersion: appState.appVersion,
      bodyCount: appState.bodyCount,
      bodies: appState.bodies,
      simulationConfig: appState.simulationConfig,
      uiState: {
        selectedBodyId: appState.uiState.selectedBodyId,
        cameraTarget: appState.uiState.cameraTarget,
        showTrails: appState.uiState.showTrails,
        expandedBodyPanels: appState.uiState.expandedBodyPanels
      },
      committedInitialState: appState.committedInitialState,
      playbackRestorePolicy: appState.playbackRestorePolicy
    });
  }

  getStorage() {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }
}