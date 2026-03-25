export const TEXTURE_ROOT = "./images";

export function normalizeTextureKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function getTexturePath(bodyName, textureRoot = TEXTURE_ROOT) {
  const textureKey = normalizeTextureKey(bodyName);
  return textureKey ? `${textureRoot}/${textureKey}.jpg` : null;
}

export function resolveLoadedTexture(textureCache, bodyName) {
  const textureKey = normalizeTextureKey(bodyName);

  if (!textureKey) {
    return null;
  }

  const cachedTexture = textureCache.get(textureKey);
  return cachedTexture?.status === "loaded" ? cachedTexture.texture : null;
}

export function createBodyMaterialVisual(bodyColor, texture) {
  return {
    map: texture,
    color: texture ? 0xffffff : bodyColor,
    emissive: texture ? 0x111111 : bodyColor,
    emissiveIntensity: texture ? 0.05 : 0.15
  };
}

function defaultPointEquals(left, right) {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

export function syncTrailHistoryEntries({
  trailHistory,
  bodies,
  showTrails,
  simulationTime,
  maxTrailPoints,
  selectPoint,
  pointsEqual = defaultPointEquals
}) {
  const nextHistory = new Map();

  if (!showTrails) {
    return nextHistory;
  }

  const normalizedMaxPoints = Math.max(2, Number(maxTrailPoints) || 300);

  for (const body of bodies) {
    const previousHistory = simulationTime === 0 ? [] : [...(trailHistory.get(body.id) ?? [])];
    const nextPoint = selectPoint(body);
    const lastPoint = previousHistory.at(-1);

    if (!lastPoint || !pointsEqual(lastPoint, nextPoint)) {
      previousHistory.push(nextPoint);
    }

    while (previousHistory.length > normalizedMaxPoints) {
      previousHistory.shift();
    }

    nextHistory.set(body.id, previousHistory);
  }

  return nextHistory;
}