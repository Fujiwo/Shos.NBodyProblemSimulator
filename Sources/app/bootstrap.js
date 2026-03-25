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

  const persistence = new PersistenceFacade();
  const loadResult = persistence.load();
  const store = new AppStore(createInitialModel(loadResult.appState));
  const renderer = new RendererFacade(canvasElement);
  const controller = new SimulationController(store, persistence);
  const uiShell = new UiShell(rootElement, controller);
  const renderCurrentModel = () => renderer.render(store.getState());
  const layoutService = new LayoutService(documentRef.documentElement, renderer, renderCurrentModel);

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

  statusParts.push(`Renderer initialized in ${renderer.getModeLabel()}.`);
  controller.setStatus(statusParts.join(" "));

  layoutService.start();

  const initialModel = store.getState();
  persistence.stage(initialModel.appState);
  uiShell.render(initialModel);
  renderer.render(initialModel);
}