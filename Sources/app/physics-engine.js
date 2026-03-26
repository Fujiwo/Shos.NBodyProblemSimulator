// Provides pure N-body integration and energy calculations for main-thread and worker execution.

function createZeroVector() {
  return { x: 0, y: 0, z: 0 };
}

function cloneBodies(bodies) {
  return bodies.map((body) => ({
    ...body,
    position: { ...body.position },
    velocity: { ...body.velocity }
  }));
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

function applyDerivative(body, derivative, scale) {
  return {
    ...body,
    position: {
      x: body.position.x + derivative.position.x * scale,
      y: body.position.y + derivative.position.y * scale,
      z: body.position.z + derivative.position.z * scale
    },
    velocity: {
      x: body.velocity.x + derivative.velocity.x * scale,
      y: body.velocity.y + derivative.velocity.y * scale,
      z: body.velocity.z + derivative.velocity.z * scale
    }
  };
}

function computeDerivatives(bodies, simulationConfig) {
  const accelerations = computeAccelerations(bodies, simulationConfig);

  return bodies.map((body, index) => ({
    position: {
      x: body.velocity.x,
      y: body.velocity.y,
      z: body.velocity.z
    },
    velocity: accelerations[index]
  }));
}

export function stepRungeKutta4(bodies, simulationConfig) {
  const dt = Number(simulationConfig.timeStep);
  const k1 = computeDerivatives(bodies, simulationConfig);
  const k2Bodies = bodies.map((body, index) => applyDerivative(body, k1[index], dt * 0.5));
  const k2 = computeDerivatives(k2Bodies, simulationConfig);
  const k3Bodies = bodies.map((body, index) => applyDerivative(body, k2[index], dt * 0.5));
  const k3 = computeDerivatives(k3Bodies, simulationConfig);
  const k4Bodies = bodies.map((body, index) => applyDerivative(body, k3[index], dt));
  const k4 = computeDerivatives(k4Bodies, simulationConfig);

  for (let index = 0; index < bodies.length; index += 1) {
    const body = bodies[index];

    body.position.x += (dt / 6) * (k1[index].position.x + 2 * k2[index].position.x + 2 * k3[index].position.x + k4[index].position.x);
    body.position.y += (dt / 6) * (k1[index].position.y + 2 * k2[index].position.y + 2 * k3[index].position.y + k4[index].position.y);
    body.position.z += (dt / 6) * (k1[index].position.z + 2 * k2[index].position.z + 2 * k3[index].position.z + k4[index].position.z);

    body.velocity.x += (dt / 6) * (k1[index].velocity.x + 2 * k2[index].velocity.x + 2 * k3[index].velocity.x + k4[index].velocity.x);
    body.velocity.y += (dt / 6) * (k1[index].velocity.y + 2 * k2[index].velocity.y + 2 * k3[index].velocity.y + k4[index].velocity.y);
    body.velocity.z += (dt / 6) * (k1[index].velocity.z + 2 * k2[index].velocity.z + 2 * k3[index].velocity.z + k4[index].velocity.z);
  }
}

export function stepBodies(bodies, simulationConfig) {
  if (simulationConfig.integrator === "rk4") {
    stepRungeKutta4(bodies, simulationConfig);
    return;
  }

  stepVelocityVerlet(bodies, simulationConfig);
}

export function simulateBatch({
  bodies,
  simulationConfig,
  stepCount,
  referenceEnergy,
  initialStepCount = 0
}) {
  const nextBodies = cloneBodies(bodies);

  for (let index = 0; index < stepCount; index += 1) {
    stepBodies(nextBodies, simulationConfig);
  }

  const totalEnergy = computeTotalEnergy(nextBodies, simulationConfig);
  const denominator = Math.max(Math.abs(referenceEnergy), 1e-12);
  const energyError = Math.abs(totalEnergy - referenceEnergy) / denominator;
  const totalStepCount = initialStepCount + stepCount;

  return {
    bodies: nextBodies,
    totalEnergy,
    energyError,
    totalStepCount,
    simulationTime: totalStepCount * Number(simulationConfig.timeStep)
  };
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