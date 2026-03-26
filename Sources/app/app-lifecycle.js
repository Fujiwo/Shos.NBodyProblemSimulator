// Stores the active app instance on a shared global holder and disposes the previous instance during replacement.

const APP_HOLDER_KEY = "__N_BODY_APP__";

export function getActiveApp(globalRef = globalThis) {
  return globalRef[APP_HOLDER_KEY] ?? null;
}

export function setActiveApp(app, globalRef = globalThis) {
  globalRef[APP_HOLDER_KEY] = app;
  return app;
}

export function clearActiveApp(globalRef = globalThis) {
  delete globalRef[APP_HOLDER_KEY];
}

export function replaceActiveApp(createApp, globalRef = globalThis) {
  const previousApp = getActiveApp(globalRef);

  const nextApp = createApp();
  previousApp?.dispose?.();
  return setActiveApp(nextApp, globalRef);
}

export function disposeActiveApp(globalRef = globalThis) {
  const activeApp = getActiveApp(globalRef);

  if (!activeApp) {
    return;
  }

  activeApp.dispose?.();
  clearActiveApp(globalRef);
}