import { createBody } from "./defaults.js";
import { normalizeBodyCountForPreset, normalizePresetId } from "./state-rules.js";

const RANDOM_CLUSTER_RADIUS = 6;
const RANDOM_CLUSTER_MIN_DISTANCE = 0.8;
const RANDOM_CLUSTER_MAX_ATTEMPTS = 100;
const RANDOM_CLUSTER_MIN_MASS = 0.5;
const RANDOM_CLUSTER_MASS_RANGE = 7.5;
const RANDOM_CLUSTER_MIN_SPEED = 0.3;
const RANDOM_CLUSTER_SPEED_RANGE = 1.1;
const RANDOM_CLUSTER_VELOCITY_JITTER = 0.25;

function createPrng(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeedFromTime() {
  return Date.now() >>> 0;
}

function sanitizeSeed(seed) {
  return Number.isInteger(seed) && seed >= 0 && seed <= 4294967295
    ? seed
    : createSeedFromTime();
}

function samplePointInSphere(random, radius) {
  while (true) {
    const point = {
      x: (random() * 2 - 1) * radius,
      y: (random() * 2 - 1) * radius,
      z: (random() * 2 - 1) * radius
    };
    const squaredLength = point.x ** 2 + point.y ** 2 + point.z ** 2;

    if (squaredLength <= radius ** 2) {
      return point;
    }
  }
}

function measureMinimumDistance(points) {
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (let sourceIndex = 0; sourceIndex < points.length; sourceIndex += 1) {
    for (let targetIndex = sourceIndex + 1; targetIndex < points.length; targetIndex += 1) {
      const dx = points[sourceIndex].x - points[targetIndex].x;
      const dy = points[sourceIndex].y - points[targetIndex].y;
      const dz = points[sourceIndex].z - points[targetIndex].z;
      minimumDistance = Math.min(minimumDistance, Math.hypot(dx, dy, dz));
    }
  }

  return minimumDistance;
}

function recenterPoints(points) {
  const center = points.reduce((accumulator, point) => ({
    x: accumulator.x + point.x,
    y: accumulator.y + point.y,
    z: accumulator.z + point.z
  }), { x: 0, y: 0, z: 0 });

  center.x /= points.length;
  center.y /= points.length;
  center.z /= points.length;

  const shifted = points.map((point) => ({
    x: point.x - center.x,
    y: point.y - center.y,
    z: point.z - center.z
  }));

  const maximumRadius = shifted.reduce((currentMax, point) => Math.max(currentMax, Math.hypot(point.x, point.y, point.z)), 0);

  if (maximumRadius <= RANDOM_CLUSTER_RADIUS || maximumRadius === 0) {
    return shifted;
  }

  const scale = RANDOM_CLUSTER_RADIUS / maximumRadius;

  return shifted.map((point) => ({
    x: point.x * scale,
    y: point.y * scale,
    z: point.z * scale
  }));
}

function createRandomClusterPositions(bodyCount, random) {
  let bestCandidate = null;
  let bestMinimumDistance = -1;

  for (let attempt = 0; attempt < RANDOM_CLUSTER_MAX_ATTEMPTS; attempt += 1) {
    const candidate = Array.from({ length: bodyCount }, () => samplePointInSphere(random, RANDOM_CLUSTER_RADIUS));
    const minimumDistance = measureMinimumDistance(candidate);

    if (minimumDistance > bestMinimumDistance) {
      bestCandidate = candidate;
      bestMinimumDistance = minimumDistance;
    }

    if (minimumDistance >= RANDOM_CLUSTER_MIN_DISTANCE) {
      return recenterPoints(candidate);
    }
  }

  return recenterPoints(bestCandidate ?? Array.from({ length: bodyCount }, () => ({ x: 0, y: 0, z: 0 })));
}

function removeCenterOfMassVelocity(bodies) {
  const totalMass = bodies.reduce((sum, body) => sum + body.mass, 0);
  const centerVelocity = bodies.reduce((accumulator, body) => ({
    x: accumulator.x + body.velocity.x * body.mass,
    y: accumulator.y + body.velocity.y * body.mass,
    z: accumulator.z + body.velocity.z * body.mass
  }), { x: 0, y: 0, z: 0 });

  centerVelocity.x /= totalMass;
  centerVelocity.y /= totalMass;
  centerVelocity.z /= totalMass;

  for (const body of bodies) {
    body.velocity.x -= centerVelocity.x;
    body.velocity.y -= centerVelocity.y;
    body.velocity.z -= centerVelocity.z;
  }

  return bodies;
}

function createBinaryOrbitBodies() {
  const orbitRadius = 0.85;
  const orbitalSpeed = Math.sqrt(1 / (4 * orbitRadius));

  return [
    {
      ...createBody(0),
      mass: 1,
      position: { x: -orbitRadius, y: 0, z: 0 },
      velocity: { x: 0, y: -orbitalSpeed, z: 0 }
    },
    {
      ...createBody(1),
      mass: 1,
      position: { x: orbitRadius, y: 0, z: 0 },
      velocity: { x: 0, y: orbitalSpeed, z: 0 }
    }
  ];
}

function createRandomClusterBodies(bodyCount, seed) {
  const random = createPrng(seed);
  const positions = createRandomClusterPositions(bodyCount, random);
  const bodies = positions.map((position, index) => {
    const baseBody = createBody(index);
    const tangent = Math.hypot(position.x, position.y) > 0.0001
      ? { x: -position.y, y: position.x, z: 0 }
      : { x: 0, y: 1, z: 0 };
    const tangentLength = Math.hypot(tangent.x, tangent.y, tangent.z) || 1;
    const speed = RANDOM_CLUSTER_MIN_SPEED + random() * RANDOM_CLUSTER_SPEED_RANGE;
    const radialJitter = {
      x: (random() * 2 - 1) * RANDOM_CLUSTER_VELOCITY_JITTER,
      y: (random() * 2 - 1) * RANDOM_CLUSTER_VELOCITY_JITTER,
      z: (random() * 2 - 1) * RANDOM_CLUSTER_VELOCITY_JITTER
    };

    return {
      ...baseBody,
      mass: Number((RANDOM_CLUSTER_MIN_MASS + random() * RANDOM_CLUSTER_MASS_RANGE).toFixed(2)),
      position: {
        x: Number(position.x.toFixed(2)),
        y: Number(position.y.toFixed(2)),
        z: Number(position.z.toFixed(2))
      },
      velocity: {
        x: Number(((tangent.x / tangentLength) * speed + radialJitter.x).toFixed(2)),
        y: Number(((tangent.y / tangentLength) * speed + radialJitter.y).toFixed(2)),
        z: Number(radialJitter.z.toFixed(2))
      }
    };
  });

  return removeCenterOfMassVelocity(bodies);
}

export function generatePresetBodies({ presetId, bodyCount, seed }) {
  const normalizedPresetId = normalizePresetId(presetId);

  if (normalizedPresetId === "binary-orbit") {
    return {
      presetId: normalizedPresetId,
      seed: null,
      bodyCount: 2,
      bodies: createBinaryOrbitBodies()
    };
  }

  const nextBodyCount = normalizeBodyCountForPreset(normalizedPresetId, bodyCount);
  const nextSeed = sanitizeSeed(seed);

  return {
    presetId: normalizedPresetId,
    seed: nextSeed,
    bodyCount: nextBodyCount,
    bodies: createRandomClusterBodies(nextBodyCount, nextSeed)
  };
}