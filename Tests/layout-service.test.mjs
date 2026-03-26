import assert from "node:assert/strict";

import { LayoutService } from "../Sources/app/layout-service.js";

function testLayoutServiceStartsAndStopsResizeBinding() {
  const calls = [];
  const resizeTarget = {
    addEventListener(type, listener) {
      calls.push({ action: "add", type, listener });
      this.listener = listener;
    },
    removeEventListener(type, listener) {
      calls.push({ action: "remove", type, listener });
    }
  };
  const renderer = {
    resize() {
      calls.push({ action: "resize" });
    }
  };
  const documentRoot = {
    style: {
      setProperty(name, value) {
        calls.push({ action: "style", name, value });
      }
    }
  };

  globalThis.window = { innerHeight: 720 };

  const service = new LayoutService(documentRoot, renderer, () => {
    calls.push({ action: "render" });
  }, { resizeTarget });

  service.start();
  resizeTarget.listener();
  service.stop();

  assert.equal(calls.some((entry) => entry.action === "add" && entry.type === "resize"), true);
  assert.equal(calls.some((entry) => entry.action === "remove" && entry.type === "resize"), true);
  assert.equal(calls.some((entry) => entry.action === "style" && entry.value === "720px"), true);
  assert.equal(calls.filter((entry) => entry.action === "resize").length >= 2, true);
  assert.equal(calls.filter((entry) => entry.action === "render").length >= 2, true);
}

testLayoutServiceStartsAndStopsResizeBinding();

console.log("layout-service.test.mjs ok");