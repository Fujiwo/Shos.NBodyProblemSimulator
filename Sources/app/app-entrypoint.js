import { replaceActiveApp } from "./app-lifecycle.js";

function annotateReinitializeLifecycle(app, reason) {
  return {
    ...app,
    lifecycle: {
      ...(app.lifecycle ?? {}),
      reinitializeReason: reason
    }
  };
}

export function createReinitializeApp({ createApp, globalRef = globalThis }) {
  return function reinitializeApp(options = {}) {
    const { reason = "manual-restart", ...appOptions } = options;

    return replaceActiveApp(() => {
      const app = createApp(appOptions);
      return annotateReinitializeLifecycle(app, reason);
    }, globalRef);
  };
}