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

    return replaceActiveApp(() => {
      const app = createApp(appOptions);

      reinitializeSequence += 1;

      return annotateReinitializeLifecycle(app, {
        reinitializeReason: reason,
        reinitializeSequence,
        reinitializedAt: now()
      });
    }, globalRef);
  };
}