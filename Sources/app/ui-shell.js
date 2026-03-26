import { formatPlaybackState } from "./defaults.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFieldKey(bodyId, fieldPath) {
  return `body:${bodyId}:${fieldPath}`;
}

function resolveFieldValue(runtime, bodyId, fieldPath, fallbackValue) {
  const key = getFieldKey(bodyId, fieldPath);
  return runtime.fieldDrafts[key] ?? fallbackValue;
}

function renderFieldError(fieldErrors, key) {
  return fieldErrors[key] ? `<span class="field-error">${escapeHtml(fieldErrors[key])}</span>` : "<span class=\"field-error\"></span>";
}

function formatCurrentSeed(seed) {
  return seed === null ? "Preset fixed" : String(seed);
}

function formatReproducibilityKey(appState) {
  const { presetId, seed } = appState.simulationConfig;

  if (presetId === "random-cluster") {
    return `${presetId} | seed=${seed ?? "auto"} | bodyCount=${appState.bodyCount}`;
  }

  return presetId;
}

function renderCameraTargetOptions(appState) {
  const selectedValue = appState.uiState.cameraTarget;
  const systemCenterOption = `<option value="system-center"${selectedValue === "system-center" ? " selected" : ""}>System Center</option>`;
  const bodyOptions = appState.bodies
    .map((body) => `<option value="${escapeHtml(body.id)}"${selectedValue === body.id ? " selected" : ""}>${escapeHtml(body.name)} (${escapeHtml(body.id)})</option>`)
    .join("");

  return `${systemCenterOption}${bodyOptions}`;
}

function formatCompactNumber(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "--";
  }

  const rounded = Math.round(numeric * 10) / 10;

  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function formatVectorSummary(vector) {
  return `${formatCompactNumber(vector.x)}, ${formatCompactNumber(vector.y)}, ${formatCompactNumber(vector.z)}`;
}

function formatColorSummary(value) {
  return typeof value === "string" && value.length > 0 ? value.toUpperCase() : "--";
}

function vectorFieldGroupTemplate(body, runtime, vectorKey, label, disabledAttribute) {
  const axes = ["x", "y", "z"];

  return `
    <div class="vector-field-group">
      <span class="vector-field-label">${label}</span>
      <div class="vector-field-row">
        ${axes.map((axis) => {
          const fieldPath = `${vectorKey}.${axis}`;
          const fieldKey = getFieldKey(body.id, fieldPath);

          return `
            <label class="field field--axis${runtime.fieldErrors[fieldKey] ? " field--error" : ""}">
              <span>${axis.toUpperCase()}</span>
              <input data-body-id="${body.id}" data-field="${fieldPath}" type="number" step="0.1" value="${escapeHtml(resolveFieldValue(runtime, body.id, fieldPath, body[vectorKey][axis]))}"${disabledAttribute}>
              ${renderFieldError(runtime.fieldErrors, fieldKey)}
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function bodyCardTemplate(body, isExpanded, disabled, runtime, isSelected) {
  const disabledAttribute = disabled ? " disabled" : "";
  const openAttribute = isExpanded ? " open" : "";
  const fieldErrors = runtime.fieldErrors;
  const colorValue = resolveFieldValue(runtime, body.id, "color", body.color);

  return `
    <details class="body-card" data-body-card="${body.id}"${openAttribute}>
      <summary>
        <span class="body-card-badge" style="background:${escapeHtml(body.color)}"></span>
        <span class="body-card-summary">
          <span class="body-card-title-row">
            <strong>${escapeHtml(body.name)}</strong>
            <span class="body-card-meta">${escapeHtml(body.id)}${isSelected ? " · Selected" : ""}</span>
          </span>
          <span class="body-card-chip-row">
            <span class="body-card-chip">M ${formatCompactNumber(body.mass)}</span>
            <span class="body-card-chip">P ${escapeHtml(formatVectorSummary(body.position))}</span>
            <span class="body-card-chip">V ${escapeHtml(formatVectorSummary(body.velocity))}</span>
            <span class="body-card-chip">C ${escapeHtml(formatColorSummary(colorValue))}</span>
          </span>
        </span>
      </summary>
      <div class="body-card-inline-tools">
        <label class="body-card-color-control${fieldErrors[getFieldKey(body.id, "color")] ? " field--error" : ""}">
          <input aria-label="Color for ${escapeHtml(body.name)}" data-body-id="${body.id}" data-field="color" type="color" value="${escapeHtml(colorValue)}"${disabledAttribute}>
          <span class="body-card-color-code">${escapeHtml(formatColorSummary(colorValue))}</span>
        </label>
        ${renderFieldError(fieldErrors, getFieldKey(body.id, "color"))}
      </div>
      <div class="body-card-body">
        <div class="body-grid">
          <label class="field${fieldErrors[getFieldKey(body.id, "name")] ? " field--error" : ""}">
            <span>Name</span>
            <input data-body-id="${body.id}" data-field="name" type="text" value="${escapeHtml(resolveFieldValue(runtime, body.id, "name", body.name))}" maxlength="32"${disabledAttribute}>
            ${renderFieldError(fieldErrors, getFieldKey(body.id, "name"))}
          </label>
          <label class="field${fieldErrors[getFieldKey(body.id, "mass")] ? " field--error" : ""}">
            <span>Mass</span>
            <input data-body-id="${body.id}" data-field="mass" type="number" step="0.1" value="${escapeHtml(resolveFieldValue(runtime, body.id, "mass", body.mass))}"${disabledAttribute}>
            ${renderFieldError(fieldErrors, getFieldKey(body.id, "mass"))}
          </label>
          ${vectorFieldGroupTemplate(body, runtime, "position", "Position", disabledAttribute)}
          ${vectorFieldGroupTemplate(body, runtime, "velocity", "Velocity", disabledAttribute)}
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
      cameraTarget: rootElement.querySelector('[data-role="camera-target"]'),
      showTrails: rootElement.querySelector('[data-role="show-trails"]'),
      bodyCardList: rootElement.querySelector('[data-role="body-card-list"]'),
      validationList: rootElement.querySelector('[data-role="validation-list"]'),
      metricFps: rootElement.querySelector('[data-role="metric-fps"]'),
      metricSimulationTime: rootElement.querySelector('[data-role="metric-simulation-time"]'),
      metricEnergyError: rootElement.querySelector('[data-role="metric-energy-error"]'),
      metricActivePreset: rootElement.querySelector('[data-role="metric-active-preset"]'),
      metricCurrentSeed: rootElement.querySelector('[data-role="metric-current-seed"]'),
      metricBodyCount: rootElement.querySelector('[data-role="metric-body-count"]'),
      metricReproducibilityKey: rootElement.querySelector('[data-role="metric-reproducibility-key"]'),
      controlFieldWrappers: {
        bodyCount: rootElement.querySelector('[data-field-wrapper="bodyCount"]'),
        seed: rootElement.querySelector('[data-field-wrapper="seed"]'),
        timeStep: rootElement.querySelector('[data-field-wrapper="timeStep"]'),
        softening: rootElement.querySelector('[data-field-wrapper="softening"]')
      },
      controlFieldErrors: {
        bodyCount: rootElement.querySelector('[data-field-error="bodyCount"]'),
        seed: rootElement.querySelector('[data-field-error="seed"]'),
        timeStep: rootElement.querySelector('[data-field-error="timeStep"]'),
        softening: rootElement.querySelector('[data-field-error="softening"]')
      }
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
        this.controller.updateSimulationConfig("seed", target.value);
        return;
      }

      if (target.matches('[data-role="time-step"]')) {
        this.controller.updateSimulationConfig("timeStep", target.value);
        return;
      }

      if (target.matches('[data-role="softening"]')) {
        this.controller.updateSimulationConfig("softening", target.value);
        return;
      }

      if (target.matches('[data-role="camera-target"]')) {
        this.controller.updateCameraTarget(target.value);
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
    this.elements.seed.value = runtime.fieldDrafts.seed ?? (appState.simulationConfig.seed ?? "");
    this.elements.timeStep.value = runtime.fieldDrafts.timeStep ?? String(appState.simulationConfig.timeStep);
    this.elements.softening.value = runtime.fieldDrafts.softening ?? String(appState.simulationConfig.softening);
    this.elements.cameraTarget.innerHTML = renderCameraTargetOptions(appState);
    this.elements.showTrails.checked = appState.uiState.showTrails;
    this.elements.bodyCount.disabled = bodyInputsDisabled;
    this.elements.presetId.disabled = bodyInputsDisabled;
    this.elements.seed.disabled = bodyInputsDisabled;
    this.elements.timeStep.disabled = bodyInputsDisabled;
    this.elements.softening.disabled = bodyInputsDisabled;

    this.rootElement.querySelector('[data-action="generate"]').disabled = false;
    this.rootElement.querySelector('[data-action="start"]').disabled = !canStart;
    this.rootElement.querySelector('[data-action="pause"]').disabled = !canPause;
    this.rootElement.querySelector('[data-action="resume"]').disabled = !canResume;
    this.rootElement.querySelector('[data-action="reset"]').disabled = !canReset;

    this.elements.validationList.innerHTML = runtime.validationErrors
      .map((error) => `<li>${escapeHtml(error)}</li>`)
      .join("");

    for (const key of ["bodyCount", "seed", "timeStep", "softening"]) {
      const errorMessage = runtime.fieldErrors[key] ?? "";
      this.elements.controlFieldWrappers[key]?.classList.toggle("field--error", Boolean(errorMessage));
      this.elements.controlFieldErrors[key].textContent = errorMessage;
    }

    this.elements.bodyCardList.innerHTML = appState.bodies
      .map((body) => bodyCardTemplate(
        body,
        appState.uiState.expandedBodyPanels.includes(body.id),
        bodyInputsDisabled,
        runtime,
        appState.uiState.selectedBodyId === body.id
      ))
      .join("");

    this.elements.metricFps.textContent = runtime.metrics.fps;
    this.elements.metricSimulationTime.textContent = runtime.simulationTime.toFixed(3);
    this.elements.metricEnergyError.textContent = runtime.metrics.energyError;
    this.elements.metricActivePreset.textContent = appState.simulationConfig.presetId || "none";
    this.elements.metricCurrentSeed.textContent = formatCurrentSeed(appState.simulationConfig.seed);
    this.elements.metricBodyCount.textContent = String(appState.bodyCount);
    this.elements.metricReproducibilityKey.textContent = formatReproducibilityKey(appState);
  }
}