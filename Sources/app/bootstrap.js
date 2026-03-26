import { AppStore } from "./app-store.js";
import {
  createStartupCleanupRegistry,
  registerCoreStartupCleanup,
  registerSubscriptionCleanup,
  runStartupCleanup
} from "./bootstrap-startup-cleanup.js";
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

function createDestroyableCategory(category, owner, purpose, dependsOn, destroyables) {
  return { category, owner, purpose, dependsOn, destroyables };
}

export const DESTROYABLE_PLAN_ERROR = {
  DUPLICATE_CATEGORY: "duplicate-category",
  UNKNOWN_DEPENDENCY: "unknown-dependency",
  CYCLIC_DEPENDENCY: "cyclic-dependency"
};

function createDestroyablePlanError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function formatLifecycleNotice(lifecycleMetadata) {
  if (!lifecycleMetadata) {
    return "";
  }

  return `Restart ${lifecycleMetadata.reinitializeReason} #${lifecycleMetadata.reinitializeSequence} @ ${lifecycleMetadata.reinitializedAt}`;
}

function createBootstrapDestroyables({ unsubscribe, uiShell, layoutService, simulationLoop, renderer }) {
  return [
    createDestroyableCategory(
      "bindings",
      "bootstrap",
      "Detach store and DOM bindings before subsystem shutdown.",
      [],
      [
        createDestroyable("store-subscription", unsubscribe),
        createDestroyable("ui-shell", () => uiShell.dispose())
      ]
    ),
    createDestroyableCategory(
      "runtime-services",
      "bootstrap",
      "Stop resize orchestration and simulation work before renderer disposal.",
      ["bindings"],
      [
        createDestroyable("layout-service", () => layoutService.stop()),
        createDestroyable("simulation-loop", () => simulationLoop.dispose())
      ]
    ),
    createDestroyableCategory(
      "rendering",
      "renderer-facade",
      "Release rendering resources after producers and listeners are stopped.",
      ["runtime-services"],
      [
        createDestroyable("renderer", () => renderer.dispose())
      ]
    )
  ];
}

export function hasValidDestroyableOrder(destroyableCategories) {
  const resolvedCategories = new Set();

  for (const destroyableCategory of destroyableCategories) {
    if (destroyableCategory.dependsOn.some((dependency) => !resolvedCategories.has(dependency))) {
      return false;
    }

    resolvedCategories.add(destroyableCategory.category);
  }

  return true;
}

export function buildDestroyableDisposePlan(destroyableCategories) {
  const categoryNames = new Set();

  for (const destroyableCategory of destroyableCategories) {
    if (categoryNames.has(destroyableCategory.category)) {
      throw createDestroyablePlanError(
        DESTROYABLE_PLAN_ERROR.DUPLICATE_CATEGORY,
        `Duplicate destroyable category was declared: ${destroyableCategory.category}.`,
        { category: destroyableCategory.category }
      );
    }

    categoryNames.add(destroyableCategory.category);
  }

  for (const destroyableCategory of destroyableCategories) {
    for (const dependency of destroyableCategory.dependsOn) {
      if (!categoryNames.has(dependency)) {
        throw createDestroyablePlanError(
          DESTROYABLE_PLAN_ERROR.UNKNOWN_DEPENDENCY,
          `Destroyable category ${destroyableCategory.category} depends on unknown category ${dependency}.`,
          {
            category: destroyableCategory.category,
            dependency
          }
        );
      }
    }
  }

  const remainingCategories = new Map(
    destroyableCategories.map((destroyableCategory) => [destroyableCategory.category, destroyableCategory])
  );
  const resolvedCategories = new Set();
  const disposePlan = [];

  while (remainingCategories.size > 0) {
    const readyCategories = [...remainingCategories.values()]
      .filter((destroyableCategory) => destroyableCategory.dependsOn.every((dependency) => resolvedCategories.has(dependency)));

    if (readyCategories.length === 0) {
      throw createDestroyablePlanError(
        DESTROYABLE_PLAN_ERROR.CYCLIC_DEPENDENCY,
        "Destroyable categories contain cyclic dependencies.",
        {
          remainingCategories: [...remainingCategories.keys()]
        }
      );
    }

    for (const readyCategory of readyCategories) {
      disposePlan.push(readyCategory);
      resolvedCategories.add(readyCategory.category);
      remainingCategories.delete(readyCategory.category);
    }
  }

  return disposePlan;
}

function disposeDestroyables(destroyableCategories) {
  const disposePlan = buildDestroyableDisposePlan(destroyableCategories);

  for (const destroyableCategory of disposePlan) {
    for (const destroyable of destroyableCategory.destroyables) {
      destroyable.dispose();
    }
  }
}

export function bootstrapApp(documentRef, options = {}) {
  const {
    three = globalThis.THREE,
    executionMode: executionModeOverride,
    workerFactory = createWorkerFactory(),
    lifecycleMetadata = null,
    destroyablesFactory = createBootstrapDestroyables
  } = options;
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
  const startupCleanupRegistry = createStartupCleanupRegistry();

  registerCoreStartupCleanup(startupCleanupRegistry, {
    renderer,
    simulationLoop,
    layoutService,
    uiShell
  });

  try {
    controller.attachLoop(simulationLoop);
    controller.refreshValidation();
    uiShell.bindEvents();

    const unsubscribe = store.subscribe((model) => {
      uiShell.render(model);
      renderer.render(model);
    });

    registerSubscriptionCleanup(startupCleanupRegistry, unsubscribe);

    const destroyables = destroyablesFactory({
      unsubscribe,
      uiShell,
      layoutService,
      simulationLoop,
      renderer
    });
    const destroyablePlan = buildDestroyableDisposePlan(destroyables);

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
    initialModel.runtime.lifecycleMetadata = lifecycleMetadata;
    initialModel.runtime.lifecycleNotice = formatLifecycleNotice(lifecycleMetadata);
    persistence.stage(initialModel.appState);
    uiShell.render(initialModel);
    renderer.render(initialModel);

    let disposed = false;

    return {
      destroyables,
      destroyablePlan,
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

        for (const destroyableCategory of destroyablePlan) {
          for (const destroyable of destroyableCategory.destroyables) {
            destroyable.dispose();
          }
        }
      }
    };
  } catch (error) {
    runStartupCleanup(startupCleanupRegistry);
    throw error;
  }
}