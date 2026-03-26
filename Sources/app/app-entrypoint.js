// Creates a reinitializable app entrypoint that records lifecycle metadata across restarts.

import { replaceActiveApp } from "./app-lifecycle.js";

function annotateReinitializeLifecycle(app, metadata) {
  return {
    ...app,
    lifecycle: {
      ...(app.lifecycle ?? {}),
      ...metadata
    }
  };
}

export function createReinitializeApp({ createApp, globalRef = globalThis, now = () => new Date().toISOString() }) {
  let reinitializeSequence = 0;

  return function reinitializeApp(options = {}) {
    const { reason = "manual-restart", ...appOptions } = options;
    const nextSequence = reinitializeSequence + 1;
    const reinitializedAt = now();

    return replaceActiveApp(() => {
      const lifecycleMetadata = {
        reinitializeReason: reason,
        reinitializeSequence: nextSequence,
        reinitializedAt
      };
      const app = createApp({
        ...appOptions,
        lifecycleMetadata
      });

      reinitializeSequence = nextSequence;

      return annotateReinitializeLifecycle(app, lifecycleMetadata);
    }, globalRef);
  };
}