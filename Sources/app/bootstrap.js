import { AppStore } from "./app-store.js";
import { createSimulationExecutor } from "./simulation-execution.js";
import { createInitialModel } from "./defaults.js";
import { LayoutService } from "./layout-service.js";
import { PersistenceFacade } from "./persistence-facade.js";
import { RendererFacade } from "./renderer-facade.js";
import { SimulationController } from "./simulation-controller.js";
import { SimulationLoop } from "./simulation-loop.js";
import { UiShell } from "./ui-shell.js";

function resolveExecutionMode(documentRef, executionModeOverride) {
  if (executionModeOverride) {
    return executionModeOverride;
  }

  const url = new URL(documentRef.location?.href ?? globalThis.location?.href ?? "http://localhost/");
  return globalThis.__N_BODY_EXECUTION_MODE__ ?? url.searchParams.get("execution") ?? "auto";
}

function createWorkerFactory() {
  return () => new Worker(new URL("../workers/physics-worker.js", import.meta.url), { type: "module" });
}

function createDestroyable(label, dispose) {
  return { label, dispose };
}

function disposeDestroyables(destroyables) {
  for (const destroyable of destroyables) {
    destroyable.dispose();
  }
}

export function bootstrapApp(documentRef, options = {}) {
  const { three = globalThis.THREE, executionMode: executionModeOverride, workerFactory = createWorkerFactory() } = options;
  const rootElement = documentRef.querySelector('[data-role="app-root"]');
  const canvasElement = documentRef.querySelector('[data-role="viewport-canvas"]');

  const persistence = new PersistenceFacade();
  const loadResult = persistence.load();
  const store = new AppStore(createInitialModel(loadResult.appState));
  const renderer = new RendererFacade(canvasElement, { three });
  const controller = new SimulationController(store, persistence);
  const executionMode = resolveExecutionMode(documentRef, executionModeOverride);
  const executionBackend = createSimulationExecutor({
    requestedMode: executionMode,
    workerFactory
  });
  const simulationLoop = new SimulationLoop(store, executionBackend);
  const uiShell = new UiShell(rootElement, controller);
  const renderCurrentModel = () => renderer.render(store.getState());
  const layoutService = new LayoutService(documentRef.documentElement, renderer, renderCurrentModel);

  controller.attachLoop(simulationLoop);
  controller.refreshValidation();
  uiShell.bindEvents();

  const unsubscribe = store.subscribe((model) => {
    uiShell.render(model);
    renderer.render(model);
  });

  const statusParts = [];

  if (loadResult.statusMessage) {
    statusParts.push(loadResult.statusMessage);
  }

  statusParts.push(executionBackend.getStatus().message);
  statusParts.push(renderer.getInitializationStatus().message);
  controller.setStatus(statusParts.join(" "));

  layoutService.start();
  simulationLoop.start();

  const initialModel = store.getState();
  persistence.stage(initialModel.appState);
  uiShell.render(initialModel);
  renderer.render(initialModel);

  const destroyables = [
    createDestroyable("store-subscription", unsubscribe),
    createDestroyable("ui-shell", () => uiShell.dispose()),
    createDestroyable("layout-service", () => layoutService.stop()),
    createDestroyable("simulation-loop", () => simulationLoop.dispose()),
    createDestroyable("renderer", () => renderer.dispose())
  ];

  let disposed = false;

  return {
    destroyables,
    runtime: {
      persistence,
      store,
      renderer,
      controller,
      executionBackend,
      simulationLoop,
      uiShell,
      layoutService
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      disposeDestroyables(destroyables);
    }
  };
}