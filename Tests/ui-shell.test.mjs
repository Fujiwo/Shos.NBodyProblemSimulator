import assert from "node:assert/strict";

import { createInitialModel } from "../Sources/app/defaults.js";
import { UiShell } from "../Sources/app/ui-shell.js";

function createTrackedElement() {
  let innerHtmlValue = "";

  return {
    value: "",
    textContent: "",
    checked: false,
    disabled: false,
    hidden: false,
    placeholder: "",
    dataset: {},
    style: {},
    innerHtmlAssignments: 0,
    classList: {
      toggle() {}
    },
    get innerHTML() {
      return innerHtmlValue;
    },
    set innerHTML(value) {
      innerHtmlValue = value;
      this.innerHtmlAssignments += 1;
    }
  };
}

function createRootStub() {
  const selectors = new Map();
  const dataRoles = [
    "playback-state",
    "status-message",
    "execution-notice",
    "body-count",
    "preset-id",
    "seed",
    "time-step",
    "softening",
    "integrator",
    "camera-target",
    "show-trails",
    "body-card-list",
    "validation-panel",
    "validation-list",
    "metric-fps",
    "metric-simulation-time",
    "metric-energy-error",
    "metric-pipeline-time",
    "metric-integrator",
    "metric-active-preset",
    "metric-current-seed",
    "metric-body-count",
    "metric-reproducibility-key",
    "metric-lifecycle"
  ];

  for (const role of dataRoles) {
    selectors.set(`[data-role="${role}"]`, createTrackedElement());
  }

  for (const key of ["bodyCount", "seed", "timeStep", "softening", "integrator"]) {
    selectors.set(`[data-field-wrapper="${key}"]`, createTrackedElement());
    selectors.set(`[data-field-error="${key}"]`, createTrackedElement());
  }

  for (const action of ["generate", "start", "pause", "resume", "reset"]) {
    selectors.set(`[data-action="${action}"]`, createTrackedElement());
  }

  return {
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) {
      return selectors.get(selector) ?? null;
    },
    elements: selectors
  };
}

function testUiShellSkipsHeavyInnerHtmlUpdatesDuringRunningMetricsRefresh() {
  const root = createRootStub();
  const shell = new UiShell(root, {});
  const model = createInitialModel();

  shell.render(model);

  model.appState.uiState.playbackState = "running";
  model.runtime.metrics.fps = "12.34";
  model.runtime.simulationTime = 1.23;
  model.appState.bodies[0].position.x += 5;
  shell.render(model);

  const bodyCardList = root.elements.get('[data-role="body-card-list"]');
  const cameraTarget = root.elements.get('[data-role="camera-target"]');
  const validationList = root.elements.get('[data-role="validation-list"]');

  const bodyCardAssignmentsAfterRunningTransition = bodyCardList.innerHtmlAssignments;
  const cameraTargetAssignmentsAfterRunningTransition = cameraTarget.innerHtmlAssignments;
  const validationAssignmentsAfterRunningTransition = validationList.innerHtmlAssignments;

  model.runtime.metrics.fps = "15.67";
  model.runtime.simulationTime = 2.5;
  model.runtime.metrics.pipelineTime = "0.25 ms";
  model.appState.bodies[0].position.x += 3;
  model.appState.bodies[0].velocity.y += 0.5;
  shell.render(model);

  assert.equal(bodyCardList.innerHtmlAssignments, bodyCardAssignmentsAfterRunningTransition);
  assert.equal(cameraTarget.innerHtmlAssignments, cameraTargetAssignmentsAfterRunningTransition);
  assert.equal(validationList.innerHtmlAssignments, validationAssignmentsAfterRunningTransition);
  assert.equal(root.elements.get('[data-role="metric-fps"]').textContent, "15.67");
  assert.equal(root.elements.get('[data-role="metric-pipeline-time"]').textContent, "0.25 ms");
}

testUiShellSkipsHeavyInnerHtmlUpdatesDuringRunningMetricsRefresh();

console.log("ui-shell.test.mjs ok");