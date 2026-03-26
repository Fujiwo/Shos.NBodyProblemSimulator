// Creates and restores committed initial-state snapshots used by reset and persistence flows.

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export function createCommittedInitialState(appState) {
  return {
    bodyCount: appState.bodyCount,
    bodies: cloneValue(appState.bodies),
    simulationConfig: cloneValue(appState.simulationConfig),
    uiState: {
      selectedBodyId: appState.uiState.selectedBodyId,
      cameraTarget: appState.uiState.cameraTarget,
      showTrails: appState.uiState.showTrails
    }
  };
}

export function restoreCommittedInitialState(snapshot, options = {}) {
  const {
    playbackState = "idle",
    expandedBodyPanels = []
  } = options;

  return {
    bodyCount: snapshot.bodyCount,
    bodies: cloneValue(snapshot.bodies),
    simulationConfig: cloneValue(snapshot.simulationConfig),
    uiState: {
      playbackState,
      selectedBodyId: snapshot.uiState.selectedBodyId,
      cameraTarget: snapshot.uiState.cameraTarget,
      showTrails: snapshot.uiState.showTrails,
      expandedBodyPanels: cloneValue(expandedBodyPanels)
    }
  };
}