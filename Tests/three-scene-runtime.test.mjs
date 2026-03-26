import assert from "node:assert/strict";

import {
  buildSceneTrailPlan,
  createTrailPoints,
  resolveSceneCameraFrame,
  resolveSceneCameraTarget
} from "../Sources/app/three-scene-runtime.js";

function createAppState({ bodies, showTrails = true, cameraTarget = "system-center" }) {
  return {
    bodies,
    simulationConfig: {
      maxTrailPoints: 4
    },
    uiState: {
      showTrails,
      cameraTarget
    }
  };
}

function testResolveSceneCameraTargetUsesBodyOrCenterOfMass() {
  const bodyTarget = resolveSceneCameraTarget(createAppState({
    bodies: [
      { id: "body-1", mass: 1, position: { x: 1, y: 2, z: 3 } }
    ],
    cameraTarget: "body-1"
  }));
  assert.deepEqual(bodyTarget, { x: 1, y: 2, z: 3 });

  const systemTarget = resolveSceneCameraTarget(createAppState({
    bodies: [
      { id: "body-1", mass: 1, position: { x: 0, y: 0, z: 0 } },
      { id: "body-2", mass: 3, position: { x: 4, y: 0, z: 0 } }
    ]
  }));
  assert.deepEqual(systemTarget, { x: 3, y: 0, z: 0 });
}

function testResolveSceneCameraFrameBuildsOrbitingPosition() {
  const frame = resolveSceneCameraFrame(createAppState({
    bodies: [
      { id: "body-1", mass: 1, position: { x: 0, y: 0, z: 0 } }
    ]
  }), 1);

  assert.equal(typeof frame.position.x, "number");
  assert.equal(frame.position.y, 3.2);
  assert.equal(frame.target.z, 0);
}

function testBuildSceneTrailPlanReportsRemovalsAndReset() {
  const priorHistory = new Map([
    ["body-1", [{ x: 0, y: 0, z: 0 }]],
    ["body-2", [{ x: 1, y: 0, z: 0 }]]
  ]);

  const plan = buildSceneTrailPlan({
    trailHistory: priorHistory,
    appState: createAppState({
      bodies: [
        { id: "body-1", position: { x: 0, y: 0, z: 0 } }
      ],
      showTrails: true
    }),
    simulationTime: 2
  });

  assert.deepEqual(plan.removedBodyIds, ["body-2"]);
  assert.equal(plan.shouldReset, false);

  const resetPlan = buildSceneTrailPlan({
    trailHistory: priorHistory,
    appState: createAppState({
      bodies: [
        { id: "body-1", position: { x: 0, y: 0, z: 0 } }
      ],
      showTrails: false
    }),
    simulationTime: 3
  });

  assert.equal(resetPlan.shouldReset, true);
}

function testCreateTrailPointsMapsEntriesToFactory() {
  const points = createTrailPoints([
    { x: 1, y: 2, z: 3 },
    { x: 4, y: 5, z: 6 }
  ], (x, y, z) => ({ x, y, z }));

  assert.deepEqual(points, [
    { x: 1, y: 2, z: 3 },
    { x: 4, y: 5, z: 6 }
  ]);
}

testResolveSceneCameraTargetUsesBodyOrCenterOfMass();
testResolveSceneCameraFrameBuildsOrbitingPosition();
testBuildSceneTrailPlanReportsRemovalsAndReset();
testCreateTrailPointsMapsEntriesToFactory();

console.log("three-scene-runtime.test.mjs ok");