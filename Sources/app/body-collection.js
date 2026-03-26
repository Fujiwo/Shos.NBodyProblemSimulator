import { createBody } from "./defaults.js";
import { normalizeBodyCountForPreset, normalizeExpandedPanels } from "./state-rules.js";

function removeBodyFieldDrafts(fieldDrafts, removedBodyIds) {
  const nextFieldDrafts = fieldDrafts && typeof fieldDrafts === "object"
    ? { ...fieldDrafts }
    : {};

  for (const bodyId of removedBodyIds) {
    const prefix = `body:${bodyId}:`;

    for (const key of Object.keys(nextFieldDrafts)) {
      if (key.startsWith(prefix)) {
        delete nextFieldDrafts[key];
      }
    }
  }

  return nextFieldDrafts;
}

export function normalizePresetBodyCollection({
  presetId,
  bodyCount,
  bodies,
  uiState,
  fieldDrafts
}) {
  const normalizedCount = normalizeBodyCountForPreset(presetId, bodyCount);
  const sourceBodies = Array.isArray(bodies) ? bodies : [];
  const removedBodyIds = sourceBodies.slice(normalizedCount).map((body) => body.id);
  const nextBodies = sourceBodies.slice(0, normalizedCount);

  for (let index = nextBodies.length; index < normalizedCount; index += 1) {
    nextBodies.push(createBody(index));
  }

  const nextUiState = uiState && typeof uiState === "object"
    ? { ...uiState }
    : {};
  const hasSelectedBody = nextBodies.some((body) => body.id === nextUiState.selectedBodyId);
  const hasCameraTarget = nextUiState.cameraTarget === "system-center"
    || nextBodies.some((body) => body.id === nextUiState.cameraTarget);

  nextUiState.selectedBodyId = hasSelectedBody ? nextUiState.selectedBodyId : null;
  nextUiState.cameraTarget = hasCameraTarget ? nextUiState.cameraTarget : "system-center";
  nextUiState.expandedBodyPanels = normalizeExpandedPanels(nextUiState.expandedBodyPanels, nextBodies);

  return {
    bodyCount: normalizedCount,
    bodies: nextBodies,
    uiState: nextUiState,
    fieldDrafts: removeBodyFieldDrafts(fieldDrafts, removedBodyIds)
  };
}