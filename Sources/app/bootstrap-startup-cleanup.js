// Tracks startup cleanup steps so partial boot failures can unwind services in reverse registration order.

export function createStartupCleanupRegistry() {
  return [];
}

export function registerStartupCleanup(cleanupRegistry, cleanupStep) {
  cleanupRegistry.push(cleanupStep);
}

export function runStartupCleanup(cleanupRegistry) {
  for (let index = cleanupRegistry.length - 1; index >= 0; index -= 1) {
    try {
      cleanupRegistry[index]();
    } catch {
      // Preserve the original startup failure and keep cleanup best-effort.
    }
  }
}

export function registerCoreStartupCleanup(cleanupRegistry, { renderer, simulationLoop, layoutService, uiShell }) {
  registerStartupCleanup(cleanupRegistry, () => renderer.dispose());
  registerStartupCleanup(cleanupRegistry, () => simulationLoop.dispose());
  registerStartupCleanup(cleanupRegistry, () => layoutService.stop());
  registerStartupCleanup(cleanupRegistry, () => uiShell.dispose());
}

export function registerSubscriptionCleanup(cleanupRegistry, unsubscribe) {
  registerStartupCleanup(cleanupRegistry, unsubscribe);
}