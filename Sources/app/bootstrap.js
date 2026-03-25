import { AppStore } from "./app-store.js";
import { createInitialModel } from "./defaults.js";
import { LayoutService } from "./layout-service.js";
import { PersistenceFacade } from "./persistence-facade.js";
import { RendererFacade } from "./renderer-facade.js";
import { SimulationController } from "./simulation-controller.js";
import { UiShell } from "./ui-shell.js";

export function bootstrapApp(documentRef) {
  const rootElement = documentRef.querySelector('[data-role="app-root"]');
  const canvasElement = documentRef.querySelector('[data-role="viewport-canvas"]');

  const store = new AppStore(createInitialModel());
  const persistence = new PersistenceFacade();
  const renderer = new RendererFacade(canvasElement);
  const controller = new SimulationController(store, persistence);
  const uiShell = new UiShell(rootElement, controller);
  const layoutService = new LayoutService(documentRef.documentElement, renderer);

  uiShell.bindEvents();

  store.subscribe((model) => {
    uiShell.render(model);
    renderer.render(model);
  });

  const persistedState = persistence.load();

  if (persistedState) {
    controller.setStatus("Persistence restore is stubbed in Phase 1. Loaded state will be used in a later phase.");
  }

  controller.setStatus(`Renderer initialized in ${renderer.getModeLabel()}.`);

  layoutService.start();

  const initialModel = store.getState();
  persistence.stage(initialModel.appState);
  uiShell.render(initialModel);
  renderer.render(initialModel);
}