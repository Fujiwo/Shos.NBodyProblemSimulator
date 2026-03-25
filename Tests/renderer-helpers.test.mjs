import assert from "node:assert/strict";

import {
  createBodyMaterialVisual,
  getTexturePath,
  normalizeTextureKey,
  resolveLoadedTexture,
  syncTrailHistoryEntries
} from "../Sources/app/renderer-helpers.js";

function testTextureFallbackUsesBodyColor() {
  const visual = createBodyMaterialVisual("#ff8800", null);

  assert.equal(visual.map, null);
  assert.equal(visual.color, "#ff8800");
  assert.equal(visual.emissive, "#ff8800");
  assert.equal(visual.emissiveIntensity, 0.15);
}

function testLoadedTextureUsesNeutralMaterialVisuals() {
  const texture = { id: "earth-texture" };
  const visual = createBodyMaterialVisual("#ff8800", texture);

  assert.equal(visual.map, texture);
  assert.equal(visual.color, 0xffffff);
  assert.equal(visual.emissive, 0x111111);
  assert.equal(visual.emissiveIntensity, 0.05);
}

function testTextureResolutionHelpers() {
  const texture = { id: "earth-texture" };
  const cache = new Map([
    ["earth", { status: "loaded", texture }],
    ["mars", { status: "error" }]
  ]);

  assert.equal(normalizeTextureKey("Earth"), "earth");
  assert.equal(getTexturePath("Earth"), "./images/earth.jpg");
  assert.equal(resolveLoadedTexture(cache, "Earth"), texture);
  assert.equal(resolveLoadedTexture(cache, "Mars"), null);
}

function testTrailHistoryResetsAndTrims() {
  const bodies = [
    { id: "body-1", position: { x: 0, y: 0, z: 0 } },
    { id: "body-2", position: { x: 1, y: 1, z: 0 } }
  ];

  let history = syncTrailHistoryEntries({
    trailHistory: new Map(),
    bodies,
    showTrails: true,
    simulationTime: 1,
    maxTrailPoints: 2,
    selectPoint: (body) => ({ ...body.position })
  });

  history = syncTrailHistoryEntries({
    trailHistory: history,
    bodies: bodies.map((body, index) => ({
      ...body,
      position: { x: body.position.x + index + 1, y: body.position.y, z: 0 }
    })),
    showTrails: true,
    simulationTime: 2,
    maxTrailPoints: 2,
    selectPoint: (body) => ({ ...body.position })
  });

  history = syncTrailHistoryEntries({
    trailHistory: history,
    bodies: bodies.map((body, index) => ({
      ...body,
      position: { x: body.position.x + index + 2, y: body.position.y, z: 0 }
    })),
    showTrails: true,
    simulationTime: 3,
    maxTrailPoints: 2,
    selectPoint: (body) => ({ ...body.position })
  });

  assert.equal(history.get("body-1").length, 2);
  assert.equal(history.get("body-2").length, 2);

  const resetHistory = syncTrailHistoryEntries({
    trailHistory: history,
    bodies,
    showTrails: false,
    simulationTime: 4,
    maxTrailPoints: 2,
    selectPoint: (body) => ({ ...body.position })
  });

  assert.equal(resetHistory.size, 0);
}

testTextureFallbackUsesBodyColor();
testLoadedTextureUsesNeutralMaterialVisuals();
testTextureResolutionHelpers();
testTrailHistoryResetsAndTrims();

console.log("renderer-helpers.test.mjs ok");