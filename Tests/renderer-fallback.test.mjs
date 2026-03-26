import assert from "node:assert/strict";

import { renderFallbackScene } from "../Sources/app/renderer-fallback.js";

function createContext(drawCalls) {
  return {
    fillStyle: null,
    strokeStyle: null,
    lineWidth: 0,
    shadowBlur: 0,
    shadowColor: null,
    font: "",
    clearRect() { drawCalls.push("clearRect"); },
    fillRect() { drawCalls.push("fillRect"); },
    save() { drawCalls.push("save"); },
    restore() { drawCalls.push("restore"); },
    beginPath() { drawCalls.push("beginPath"); },
    arc() { drawCalls.push("arc"); },
    fill() { drawCalls.push("fill"); },
    stroke() { drawCalls.push("stroke"); },
    moveTo() { drawCalls.push("moveTo"); },
    lineTo() { drawCalls.push("lineTo"); },
    fillText(text) { drawCalls.push(`fillText:${text}`); },
    createLinearGradient() {
      return { addColorStop() {} };
    }
  };
}

function testRenderFallbackSceneDrawsBackgroundBodiesTrailsAndLabel() {
  const drawCalls = [];
  renderFallbackScene({
    context: createContext(drawCalls),
    width: 640,
    height: 360,
    bodies: [
      {
        id: "body-1",
        mass: 1,
        color: "#3366ff",
        position: { x: 1, y: 2 }
      }
    ],
    trailHistory: new Map([["body-1", [{ x: 0, y: 0 }, { x: 1, y: 1 }]]]),
    pixelRatio: 1,
    showTrails: true,
    modeLabel: "2D fallback mode"
  });

  assert.ok(drawCalls.includes("clearRect"));
  assert.ok(drawCalls.includes("fillRect"));
  assert.ok(drawCalls.includes("moveTo"));
  assert.ok(drawCalls.includes("lineTo"));
  assert.ok(drawCalls.includes("fillText:2D fallback mode"));
}

testRenderFallbackSceneDrawsBackgroundBodiesTrailsAndLabel();

console.log("renderer-fallback.test.mjs ok");