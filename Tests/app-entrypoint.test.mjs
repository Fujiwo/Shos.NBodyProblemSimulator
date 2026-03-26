import assert from "node:assert/strict";

import { createReinitializeApp } from "../Sources/app/app-entrypoint.js";

function testReinitializeAppReplacesActiveAppAndPassesOptions() {
  const globalRef = {};
  const calls = [];

  const reinitializeApp = createReinitializeApp({
    globalRef,
    createApp(options) {
      calls.push({ type: "create", options });
      return {
        id: options.id,
        dispose() {
          calls.push({ type: "dispose", id: options.id });
        }
      };
    }
  });

  const firstApp = reinitializeApp({ id: "first", reason: "initial-load" });
  const secondApp = reinitializeApp({ id: "second", reason: "hmr" });

  assert.equal(firstApp.id, "first");
  assert.equal(secondApp.id, "second");
  assert.equal(firstApp.lifecycle.reinitializeReason, "initial-load");
  assert.equal(secondApp.lifecycle.reinitializeReason, "hmr");
  assert.deepEqual(calls, [
    { type: "create", options: { id: "first" } },
    { type: "create", options: { id: "second" } },
    { type: "dispose", id: "first" }
  ]);
}

function testReinitializeAppPreservesPreviousActiveAppWhenCreationFails() {
  const globalRef = {};
  const calls = [];

  const reinitializeApp = createReinitializeApp({
    globalRef,
    createApp(options) {
      if (options.fail) {
        throw new Error("reinitialize failed");
      }

      return {
        id: options.id,
        dispose() {
          calls.push(`dispose:${options.id}`);
        }
      };
    }
  });

  const previousApp = reinitializeApp({ id: "stable", reason: "manual-restart" });

  assert.throws(() => {
    reinitializeApp({ fail: true, reason: "hmr" });
  }, /reinitialize failed/);

  assert.equal(globalRef.__N_BODY_APP__, previousApp);
  assert.deepEqual(calls, []);
}

function testReinitializeAppDefaultsReasonForObservability() {
  const globalRef = {};

  const reinitializeApp = createReinitializeApp({
    globalRef,
    createApp(options) {
      return {
        id: options.id,
        lifecycle: {
          source: "existing"
        },
        dispose() {}
      };
    }
  });

  const app = reinitializeApp({ id: "implicit-reason" });

  assert.equal(app.lifecycle.source, "existing");
  assert.equal(app.lifecycle.reinitializeReason, "manual-restart");
}

testReinitializeAppReplacesActiveAppAndPassesOptions();
testReinitializeAppPreservesPreviousActiveAppWhenCreationFails();
testReinitializeAppDefaultsReasonForObservability();

console.log("app-entrypoint.test.mjs ok");