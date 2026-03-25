function createZeroVector() {
  return { x: 0, y: 0, z: 0 };
}

function squaredMagnitude(vector) {
  return vector.x ** 2 + vector.y ** 2 + vector.z ** 2;
}

export function computeAccelerations(bodies, simulationConfig) {
  const accelerations = bodies.map(() => createZeroVector());
  const gravitationalConstant = Number(simulationConfig.gravitationalConstant);
  const softeningSquared = Number(simulationConfig.softening) ** 2;

  for (let sourceIndex = 0; sourceIndex < bodies.length; sourceIndex += 1) {
    for (let targetIndex = sourceIndex + 1; targetIndex < bodies.length; targetIndex += 1) {
      const sourceBody = bodies[sourceIndex];
      const targetBody = bodies[targetIndex];
      const delta = {
        x: targetBody.position.x - sourceBody.position.x,
        y: targetBody.position.y - sourceBody.position.y,
        z: targetBody.position.z - sourceBody.position.z
      };
      const softenedDistanceSquared = squaredMagnitude(delta) + softeningSquared;
      const softenedDistance = Math.sqrt(softenedDistanceSquared);
      const inverseDistanceCubed = 1 / (softenedDistanceSquared * softenedDistance);
      const sourceScale = gravitationalConstant * targetBody.mass * inverseDistanceCubed;
      const targetScale = gravitationalConstant * sourceBody.mass * inverseDistanceCubed;

      accelerations[sourceIndex].x += delta.x * sourceScale;
      accelerations[sourceIndex].y += delta.y * sourceScale;
      accelerations[sourceIndex].z += delta.z * sourceScale;

      accelerations[targetIndex].x -= delta.x * targetScale;
      accelerations[targetIndex].y -= delta.y * targetScale;
      accelerations[targetIndex].z -= delta.z * targetScale;
    }
  }

  return accelerations;
}

export function stepVelocityVerlet(bodies, simulationConfig) {
  const dt = Number(simulationConfig.timeStep);
  const halfDtSquared = 0.5 * dt * dt;
  const initialAccelerations = computeAccelerations(bodies, simulationConfig);

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    const acceleration = initialAccelerations[index];

    body.position.x += body.velocity.x * dt + acceleration.x * halfDtSquared;
    body.position.y += body.velocity.y * dt + acceleration.y * halfDtSquared;
    body.position.z += body.velocity.z * dt + acceleration.z * halfDtSquared;
  }

  const nextAccelerations = computeAccelerations(bodies, simulationConfig);

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];
    const initialAcceleration = initialAccelerations[index];
    const nextAcceleration = nextAccelerations[index];

    body.velocity.x += 0.5 * (initialAcceleration.x + nextAcceleration.x) * dt;
    body.velocity.y += 0.5 * (initialAcceleration.y + nextAcceleration.y) * dt;
    body.velocity.z += 0.5 * (initialAcceleration.z + nextAcceleration.z) * dt;
  }
}

export function computeTotalEnergy(bodies, simulationConfig) {
  const gravitationalConstant = Number(simulationConfig.gravitationalConstant);
  const softeningSquared = Number(simulationConfig.softening) ** 2;
  let kineticEnergy = 0;
  let potentialEnergy = 0;

  for (const body of bodies) {
    kineticEnergy += 0.5 * body.mass * (
      body.velocity.x ** 2 +
      body.velocity.y ** 2 +
      body.velocity.z ** 2
    );
  }

  for (let sourceIndex = 0; sourceIndex < bodies.length; sourceIndex += 1) {
    for (let targetIndex = sourceIndex + 1; targetIndex < bodies.length; targetIndex += 1) {
      const sourceBody = bodies[sourceIndex];
      const targetBody = bodies[targetIndex];
      const delta = {
        x: targetBody.position.x - sourceBody.position.x,
        y: targetBody.position.y - sourceBody.position.y,
        z: targetBody.position.z - sourceBody.position.z
      };
      const softenedDistance = Math.sqrt(squaredMagnitude(delta) + softeningSquared);
      potentialEnergy -= (gravitationalConstant * sourceBody.mass * targetBody.mass) / softenedDistance;
    }
  }

  return kineticEnergy + potentialEnergy;
}