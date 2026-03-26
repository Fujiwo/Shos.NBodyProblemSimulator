import assert from "node:assert/strict";

import {
  applyViewportHeight,
  measureCanvasBufferSize,
  measureViewportDisplaySize
} from "../Sources/app/viewport-layout.js";

function testMeasureViewportDisplaySizeClampsToAtLeastOnePixel() {
  const result = measureViewportDisplaySize({
    getBoundingClientRect() {
      return { width: 0.4, height: 0.2 };
    }
  });

  assert.deepEqual(result, { width: 1, height: 1 });
}

function testMeasureCanvasBufferSizeAppliesPixelRatio() {
  const result = measureCanvasBufferSize({
    getBoundingClientRect() {
      return { width: 320.5, height: 180.5 };
    }
  }, 2);

  assert.deepEqual(result, { width: 640, height: 360 });
}

function testApplyViewportHeightWritesCssVariable() {
  const calls = [];
  applyViewportHeight({
    style: {
      setProperty(name, value) {
        calls.push({ name, value });
      }
    }
  }, 720);

  assert.deepEqual(calls, [{ name: "--app-height", value: "720px" }]);
}

testMeasureViewportDisplaySizeClampsToAtLeastOnePixel();
testMeasureCanvasBufferSizeAppliesPixelRatio();
testApplyViewportHeightWritesCssVariable();

console.log("viewport-layout.test.mjs ok");