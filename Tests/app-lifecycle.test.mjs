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

testReplaceActiveAppDisposesPreviousInstanceAndStoresNext();
testDisposeActiveAppDisposesAndClearsHolder();

console.log("app-lifecycle.test.mjs ok");