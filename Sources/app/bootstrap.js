import { AppStore } from "./app-store.js";
import { createSimulationExecutor } from "./simulation-execution.js";
import { createInitialModel } from "./defaults.js";
import { LayoutService } from "./layout-service.js";
import { PersistenceFacade } from "./persistence-facade.js";
import { RendererFacade } from "./renderer-facade.js";
import { SimulationController } from "./simulation-controller.js";
import { SimulationLoop } from "./simulation-loop.js";
import { UiShell } from "./ui-shell.js";

export function bootstrapApp(documentRef) {
  const rootElement = documentRef.querySelector('[data-role="app-root"]');
  const canvasElement = documentRef.querySelector('[data-role="viewport-canvas"]');

  const persistence = new PersistenceFacade();
  const loadResult = persistence.load();
  const store = new AppStore(createInitialModel(loadResult.appState));
  const renderer = new RendererFacade(canvasElement);
  const controller = new SimulationController(store, persistence);
  const url = new URL(documentRef.location?.href ?? globalThis.location?.href ?? "http://localhost/");
  const executionMode = globalThis.__N_BODY_EXECUTION_MODE__ ?? url.searchParams.get("execution") ?? "auto";
  const executionBackend = createSimulationExecutor({
    requestedMode: executionMode,
    workerFactory: () => new Worker(new URL("../workers/physics-worker.js", import.meta.url), { type: "module" })
  });
  const simulationLoop = new SimulationLoop(store, executionBackend);
  const uiShell = new UiShell(rootElement, controller);
  const renderCurrentModel = () => renderer.render(store.getState());
  const layoutService = new LayoutService(documentRef.documentElement, renderer, renderCurrentModel);

  controller.attachLoop(simulationLoop);
  controller.refreshValidation();
  uiShell.bindEvents();

  store.subscribe((model) => {
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
}