import assert from "node:assert/strict";

import {
  clearActiveApp,
  disposeActiveApp,
  getActiveApp,
  replaceActiveApp,
  setActiveApp
} from "../Sources/app/app-lifecycle.js";

function testReplaceActiveAppDisposesPreviousInstanceAndStoresNext() {
  const globalRef = {};
  const calls = [];

  setActiveApp({
    dispose() {
      calls.push("dispose:previous");
    }
  }, globalRef);

  const nextApp = replaceActiveApp(() => ({
    id: "next-app",
    dispose() {
      calls.push("dispose:next");
    }
  }), globalRef);

  assert.equal(nextApp.id, "next-app");
  assert.deepEqual(calls, ["dispose:previous"]);
  assert.equal(getActiveApp(globalRef), nextApp);
}

function testDisposeActiveAppDisposesAndClearsHolder() {
  const globalRef = {};
  const calls = [];

  setActiveApp({
    dispose() {
      calls.push("dispose:active");
    }
  }, globalRef);

  disposeActiveApp(globalRef);

  assert.deepEqual(calls, ["dispose:active"]);
  assert.equal(getActiveApp(globalRef), null);

  clearActiveApp(globalRef);
  assert.equal(getActiveApp(globalRef), null);
}

function testReplaceActiveAppKeepsPreviousAppWhenCreationFails() {
  const globalRef = {};
  const calls = [];
  const previousApp = {
    id: "previous-app",
    dispose() {
      calls.push("dispose:previous");
    }
  };

  setActiveApp(previousApp, globalRef);

  assert.throws(() => {
    replaceActiveApp(() => {
      throw new Error("bootstrap failed");
    }, globalRef);
  }, /bootstrap failed/);

  assert.deepEqual(calls, []);
  assert.equal(getActiveApp(globalRef), previousApp);
}

function testReplaceActiveAppLeavesHolderEmptyWhenFirstCreationFails() {
  const globalRef = {};

  assert.throws(() => {
    replaceActiveApp(() => {
      throw new Error("initial bootstrap failed");
    }, globalRef);
  }, /initial bootstrap failed/);

  assert.equal(getActiveApp(globalRef), null);
}

testReplaceActiveAppDisposesPreviousInstanceAndStoresNext();
testDisposeActiveAppDisposesAndClearsHolder();
testReplaceActiveAppKeepsPreviousAppWhenCreationFails();
testReplaceActiveAppLeavesHolderEmptyWhenFirstCreationFails();

console.log("app-lifecycle.test.mjs ok");