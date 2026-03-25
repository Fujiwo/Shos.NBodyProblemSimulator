import { formatPlaybackState } from "./defaults.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bodyCardTemplate(body, isExpanded, disabled) {
  const disabledAttribute = disabled ? " disabled" : "";
  const openAttribute = isExpanded ? " open" : "";

  return `
    <details class="body-card" data-body-card="${body.id}"${openAttribute}>
      <summary>
        <span class="body-card-badge" style="background:${escapeHtml(body.color)}"></span>
        <span>
          <strong>${escapeHtml(body.name)}</strong>
          <span class="body-card-meta">${escapeHtml(body.id)} · Mass ${Number(body.mass).toFixed(2)}</span>
        </span>
        <span class="body-card-meta">${isExpanded ? "Open" : "Closed"}</span>
      </summary>
      <div class="body-card-body">
        <div class="body-grid">
          <label class="field field--full">
            <span>Name</span>
            <input data-body-id="${body.id}" data-field="name" type="text" value="${escapeHtml(body.name)}" maxlength="32"${disabledAttribute}>
          </label>
          <label class="field">
            <span>Mass</span>
            <input data-body-id="${body.id}" data-field="mass" type="number" step="0.1" value="${body.mass}"${disabledAttribute}>
          </label>
          <label class="field">
            <span>Color</span>
            <input data-body-id="${body.id}" data-field="color" type="color" value="${escapeHtml(body.color)}"${disabledAttribute}>
          </label>
          <label class="field">
            <span>Position X</span>
            <input data-body-id="${body.id}" data-field="position.x" type="number" step="0.1" value="${body.position.x}"${disabledAttribute}>
          </label>
          <label class="field">
            <span>Position Y</span>
            <input data-body-id="${body.id}" data-field="position.y" type="number" step="0.1" value="${body.position.y}"${disabledAttribute}>
          </label>
          <label class="field">
            <span>Position Z</span>
            <input data-body-id="${body.id}" data-field="position.z" type="number" step="0.1" value="${body.position.z}"${disabledAttribute}>
          </label>
          <label class="field">
            <span>Velocity X</span>
            <input data-body-id="${body.id}" data-field="velocity.x" type="number" step="0.1" value="${body.velocity.x}"${disabledAttribute}>
          </label>
          <label class="field">
            <span>Velocity Y</span>
            <input data-body-id="${body.id}" data-field="velocity.y" type="number" step="0.1" value="${body.velocity.y}"${disabledAttribute}>
          </label>
          <label class="field">
            <span>Velocity Z</span>
            <input data-body-id="${body.id}" data-field="velocity.z" type="number" step="0.1" value="${body.velocity.z}"${disabledAttribute}>
          </label>
        </div>
      </div>
    </details>
  `;
}

export class UiShell {
  constructor(rootElement, controller) {
    this.rootElement = rootElement;
    this.controller = controller;
    this.elements = {
      playbackState: rootElement.querySelector('[data-role="playback-state"]'),
      statusMessage: rootElement.querySelector('[data-role="status-message"]'),
      bodyCount: rootElement.querySelector('[data-role="body-count"]'),
      presetId: rootElement.querySelector('[data-role="preset-id"]'),
      seed: rootElement.querySelector('[data-role="seed"]'),
      timeStep: rootElement.querySelector('[data-role="time-step"]'),
      softening: rootElement.querySelector('[data-role="softening"]'),
      showTrails: rootElement.querySelector('[data-role="show-trails"]'),
      bodyCardList: rootElement.querySelector('[data-role="body-card-list"]'),
      validationList: rootElement.querySelector('[data-role="validation-list"]'),
      metricFps: rootElement.querySelector('[data-role="metric-fps"]'),
      metricSimulationTime: rootElement.querySelector('[data-role="metric-simulation-time"]'),
      metricEnergyError: rootElement.querySelector('[data-role="metric-energy-error"]'),
      metricActivePreset: rootElement.querySelector('[data-role="metric-active-preset"]'),
      metricBodyCount: rootElement.querySelector('[data-role="metric-body-count"]')
    };
  }

  bindEvents() {
    this.rootElement.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;

      if (!action) {
        return;
      }

      this.controller[action]?.();
    });

    this.rootElement.addEventListener("change", (event) => {
      const target = event.target;

      if (target.matches('[data-role="body-count"]')) {
        this.controller.updateBodyCount(target.value);
        return;
      }

      if (target.matches('[data-role="preset-id"]')) {
        this.controller.updateSimulationConfig("presetId", target.value);
        return;
      }

      if (target.matches('[data-role="seed"]')) {
        this.controller.updateSimulationConfig("seed", target.value === "" ? null : Number(target.value));
        return;
      }

      if (target.matches('[data-role="time-step"]')) {
        this.controller.updateSimulationConfig("timeStep", Number(target.value));
        return;
      }

      if (target.matches('[data-role="softening"]')) {
        this.controller.updateSimulationConfig("softening", Number(target.value));
        return;
      }

      if (target.matches('[data-role="show-trails"]')) {
        this.controller.updateShowTrails(target.checked);
        return;
      }

      if (target.matches("[data-body-id][data-field]")) {
        this.controller.updateBodyField(target.dataset.bodyId, target.dataset.field, target.value);
      }
    });

    this.rootElement.addEventListener("toggle", (event) => {
      const details = event.target;

      if (!details.matches("details[data-body-card]")) {
        return;
      }

      this.controller.toggleBodyPanel(details.dataset.bodyCard, details.open);
    }, true);
  }

  render(model) {
    const { appState, runtime } = model;
    const isIdle = appState.uiState.playbackState === "idle";
    const canStart = isIdle && runtime.validationErrors.length === 0;
    const canPause = appState.uiState.playbackState === "running";
    const canResume = appState.uiState.playbackState === "paused";
    const canReset = Boolean(appState.committedInitialState);
    const bodyInputsDisabled = !isIdle;

    this.elements.playbackState.textContent = formatPlaybackState(appState.uiState.playbackState);
    this.elements.statusMessage.textContent = runtime.statusMessage;
    this.elements.bodyCount.value = String(appState.bodyCount);
    this.elements.presetId.value = appState.simulationConfig.presetId || "random-cluster";
    this.elements.seed.value = appState.simulationConfig.seed ?? "";
    this.elements.timeStep.value = String(appState.simulationConfig.timeStep);
    this.elements.softening.value = String(appState.simulationConfig.softening);
    this.elements.showTrails.checked = appState.uiState.showTrails;
    this.elements.bodyCount.disabled = bodyInputsDisabled;
    this.elements.presetId.disabled = bodyInputsDisabled;
    this.elements.seed.disabled = bodyInputsDisabled;

    this.rootElement.querySelector('[data-action="generate"]').disabled = false;
    this.rootElement.querySelector('[data-action="start"]').disabled = !canStart;
    this.rootElement.querySelector('[data-action="pause"]').disabled = !canPause;
    this.rootElement.querySelector('[data-action="resume"]').disabled = !canResume;
    this.rootElement.querySelector('[data-action="reset"]').disabled = !canReset;

    this.elements.validationList.innerHTML = runtime.validationErrors
      .map((error) => `<li>${escapeHtml(error)}</li>`)
      .join("");

    this.elements.bodyCardList.innerHTML = appState.bodies
      .map((body) => bodyCardTemplate(body, appState.uiState.expandedBodyPanels.includes(body.id), bodyInputsDisabled))
      .join("");

    this.elements.metricFps.textContent = runtime.metrics.fps;
    this.elements.metricSimulationTime.textContent = runtime.simulationTime.toFixed(3);
    this.elements.metricEnergyError.textContent = runtime.metrics.energyError;
    this.elements.metricActivePreset.textContent = appState.simulationConfig.presetId || "none";
    this.elements.metricBodyCount.textContent = String(appState.bodyCount);
  }
}