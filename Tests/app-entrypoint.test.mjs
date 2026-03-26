import assert from "node:assert/strict";

import { createReinitializeApp } from "../Sources/app/app-entrypoint.js";

function testReinitializeAppReplacesActiveAppAndPassesOptions() {
  const globalRef = {};
  const calls = [];
  const timestamps = ["2026-03-27T00:00:00.000Z", "2026-03-27T00:00:01.000Z"];

  const reinitializeApp = createReinitializeApp({
    globalRef,
    now() {
      return timestamps.shift();
    },
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
  assert.equal(firstApp.lifecycle.reinitializeSequence, 1);
  assert.equal(firstApp.lifecycle.reinitializedAt, "2026-03-27T00:00:00.000Z");
  assert.equal(secondApp.lifecycle.reinitializeReason, "hmr");
  assert.equal(secondApp.lifecycle.reinitializeSequence, 2);
  assert.equal(secondApp.lifecycle.reinitializedAt, "2026-03-27T00:00:01.000Z");
  assert.deepEqual(calls, [
    {
      type: "create",
      options: {
        id: "first",
        lifecycleMetadata: {
          reinitializeReason: "initial-load",
          reinitializeSequence: 1,
          reinitializedAt: "2026-03-27T00:00:00.000Z"
        }
      }
    },
    {
      type: "create",
      options: {
        id: "second",
        lifecycleMetadata: {
          reinitializeReason: "hmr",
          reinitializeSequence: 2,
          reinitializedAt: "2026-03-27T00:00:01.000Z"
        }
      }
    },
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
    now() {
      return "2026-03-27T00:00:02.000Z";
    },
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
  assert.equal(app.lifecycle.reinitializeSequence, 1);
  assert.equal(app.lifecycle.reinitializedAt, "2026-03-27T00:00:02.000Z");
}

function testReinitializeSequenceAdvancesOnlyAfterSuccessfulCreation() {
  const globalRef = {};
  const timestamps = [
    "2026-03-27T00:00:03.000Z",
    "2026-03-27T00:00:03.500Z",
    "2026-03-27T00:00:04.000Z"
  ];

  const reinitializeApp = createReinitializeApp({
    globalRef,
    now() {
      return timestamps.shift();
    },
    createApp(options) {
      if (options.fail) {
        throw new Error("reinitialize failed");
      }

      return {
        id: options.id,
        dispose() {}
      };
    }
  });

  const firstApp = reinitializeApp({ id: "first", reason: "initial-load" });

  assert.throws(() => {
    reinitializeApp({ fail: true, reason: "hmr" });
  }, /reinitialize failed/);

  const secondApp = reinitializeApp({ id: "second", reason: "manual-restart" });

  assert.equal(firstApp.lifecycle.reinitializeSequence, 1);
  assert.equal(secondApp.lifecycle.reinitializeSequence, 2);
  assert.equal(secondApp.lifecycle.reinitializedAt, "2026-03-27T00:00:04.000Z");
}

testReinitializeAppReplacesActiveAppAndPassesOptions();
testReinitializeAppPreservesPreviousActiveAppWhenCreationFails();
testReinitializeAppDefaultsReasonForObservability();
testReinitializeSequenceAdvancesOnlyAfterSuccessfulCreation();

console.log("app-entrypoint.test.mjs ok");