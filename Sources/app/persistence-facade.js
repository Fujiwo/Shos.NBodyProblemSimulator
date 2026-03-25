import { STORAGE_KEY, clone } from "./defaults.js";

export class PersistenceFacade {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.lastSerializedState = null;
  }

  load() {
    return null;
  }

  stage(appState) {
    this.lastSerializedState = this.serialize(appState);
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
}