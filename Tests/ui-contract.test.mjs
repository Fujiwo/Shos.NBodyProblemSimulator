import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcesDir = path.resolve(__dirname, "../Sources");

function readSourceFile(relativePath) {
  return fs.readFileSync(path.join(sourcesDir, relativePath), "utf8");
}

function testCompactControlsMarkup() {
  const indexHtml = readSourceFile("index.html");

  assert.match(indexHtml, /<p class="eyebrow">Setup<\/p>/);
  assert.match(indexHtml, /<h2 id="controls-heading">Controls<\/h2>/);
  assert.match(indexHtml, /<p class="status-notice" data-role="execution-notice" hidden><\/p>/);

  assert.match(indexHtml, /<span title="Body Count">Count<\/span>/);
  assert.match(indexHtml, /<input data-role="body-count" type="number" min="2" max="10" step="1" inputmode="numeric" aria-label="Body Count">/);
  assert.match(indexHtml, /<select data-role="preset-id" aria-label="Preset">/);
  assert.match(indexHtml, /<input data-role="seed" type="number" min="0" max="4294967295" step="1" inputmode="numeric" aria-label="Seed" placeholder="auto on Gen">/);
  assert.match(indexHtml, /<span title="Time Step">dt<\/span>/);
  assert.match(indexHtml, /<input data-role="time-step" type="number" step="0\.001" inputmode="decimal" aria-label="Time Step">/);
  assert.match(indexHtml, /<span title="Softening">Soft<\/span>/);
  assert.match(indexHtml, /<input data-role="softening" type="number" step="0\.001" inputmode="decimal" aria-label="Softening">/);
  assert.match(indexHtml, /<span title="Integrator">Int<\/span>/);
  assert.match(indexHtml, /<select data-role="integrator" aria-label="Integrator">/);
  assert.match(indexHtml, /<option value="velocity-verlet">Verlet<\/option>/);
  assert.match(indexHtml, /<option value="rk4">RK4<\/option>/);
  assert.match(indexHtml, /<span title="Camera Target">Target<\/span>/);
  assert.match(indexHtml, /<select data-role="camera-target" aria-label="Camera Target"><\/select>/);
  assert.match(indexHtml, /<span title="Trails">Trail<\/span>/);
  assert.match(indexHtml, /<input data-role="show-trails" type="checkbox" aria-label="Trails">/);

  assert.match(indexHtml, /<button data-action="generate" type="button" title="Generate" aria-label="Generate">Gen<\/button>/);
  assert.match(indexHtml, /<button data-action="start" type="button" title="Start" aria-label="Start">Run<\/button>/);
  assert.match(indexHtml, /<button data-action="pause" type="button" title="Pause" aria-label="Pause">Hold<\/button>/);
  assert.match(indexHtml, /<button data-action="resume" type="button" title="Resume" aria-label="Resume">Go<\/button>/);
  assert.match(indexHtml, /<button data-action="reset" type="button" title="Reset" aria-label="Reset">Reset<\/button>/);

  assert.match(indexHtml, /<option value="binary-orbit">Binary<\/option>/);
  assert.match(indexHtml, /<option value="sample">Sample<\/option>/);
  assert.match(indexHtml, /<option value="random-cluster">Random<\/option>/);
  assert.match(indexHtml, /<dt>Pipeline Time<\/dt>/);
  assert.match(indexHtml, /<dt>Integrator<\/dt>/);
  assert.match(indexHtml, /<dt>Lifecycle<\/dt>/);
}

function testValidationPanelDefaultsToHidden() {
  const indexHtml = readSourceFile("index.html");

  assert.match(indexHtml, /<div class="validation-panel" data-role="validation-panel" aria-live="polite" hidden>/);
  assert.match(indexHtml, /<p class="validation-title">Errors<\/p>/);
}

function testCompactControlsCssContract() {
  const styleCss = readSourceFile("style.css");
  const uiShellSource = readSourceFile("app/ui-shell.js");

  assert.match(styleCss, /\.app-header \{[\s\S]*?gap: 6px;[\s\S]*?padding: 8px 10px;/);
  assert.match(styleCss, /h1 \{[\s\S]*?font-size: clamp\(0\.96rem, 1\.3vw, 1\.18rem\);/);
  assert.match(styleCss, /\.header-copy \{[\s\S]*?display: none;/);
  assert.match(styleCss, /\.status-copy \{[\s\S]*?display: -webkit-box;[\s\S]*?-webkit-line-clamp: 1;/);
  assert.match(styleCss, /\.control-panel \.field input,\s*\n\.control-panel \.field select \{[\s\S]*?min-height: 36px;/);
  assert.match(styleCss, /\.control-panel button \{[\s\S]*?min-height: 36px;/);
  assert.match(styleCss, /\.validation-panel\[hidden\] \{[\s\S]*?display: none;/);
  assert.match(styleCss, /\.status-notice\[hidden\] \{[\s\S]*?display: none;/);
  assert.match(styleCss, /\.viewport-stage \{[\s\S]*?min-height: clamp\(420px, 56vh, 540px\);/);
  assert.match(styleCss, /grid-template-columns: minmax\(240px, 300px\) minmax\(0, 1fr\);/);
  assert.match(styleCss, /grid-template-areas:[\s\S]*?"controls controls"[\s\S]*?"bodies viewport"/);
  assert.match(styleCss, /@media \(min-width: 600px\) \{[\s\S]*?\.viewport-stage \{[\s\S]*?min-height: clamp\(520px, 66vh, 700px\);/);
  assert.match(styleCss, /\.metrics-overlay \{[\s\S]*?width: min\(calc\(100% - 20px\), 228px\);[\s\S]*?padding: 10px 12px;/);
  assert.match(styleCss, /@media \(min-width: 1024px\) \{[\s\S]*?\.viewport-panel \{[\s\S]*?min-height: calc\(var\(--app-height\) \* 1\.08 - 88px\);/);
  assert.match(styleCss, /@media \(min-width: 1024px\) \{[\s\S]*?\.control-panel \{[\s\S]*?grid-template-columns: minmax\(140px, 170px\) minmax\(0, 1fr\) minmax\(280px, 340px\);/);
  assert.match(styleCss, /@media \(min-width: 1024px\) \{[\s\S]*?\.viewport-stage \{[\s\S]*?min-height: clamp\(680px, 78vh, 900px\);/);
  assert.match(styleCss, /@media \(min-width: 1280px\) \{[\s\S]*?\.app-header \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(360px, 1\.2fr\);/);
  assert.match(styleCss, /@media \(min-width: 1440px\) \{[\s\S]*?\.header-copy \{[\s\S]*?display: block;/);
  assert.match(styleCss, /@media \(min-width: 1440px\) \{[\s\S]*?\.control-panel \.control-grid \{[\s\S]*?grid-template-columns: repeat\(8, minmax\(0, 1fr\)\);/);
  assert.match(styleCss, /@media \(min-width: 1440px\) \{[\s\S]*?\.viewport-stage \{[\s\S]*?min-height: clamp\(760px, 86vh, 1020px\);/);
  assert.match(styleCss, /\.control-panel \.button-grid \{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
  assert.match(styleCss, /\.body-card-toggle \{[\s\S]*?min-height: 24px;/);
  assert.match(styleCss, /\.body-card-body\[hidden\] \{[\s\S]*?display: none;/);
  assert.match(uiShellSource, /data-body-toggle="\$\{body\.id\}"/);
  assert.match(uiShellSource, /data-open="\$\{isExpanded \? "true" : "false"\}"/);
  assert.match(uiShellSource, /role="switch"/);
  assert.match(uiShellSource, /this\.elements\.seed\.placeholder = appState\.simulationConfig\.presetId === "random-cluster"/);
  assert.match(uiShellSource, /function formatDisplayFloat\(value\)/);
  assert.match(uiShellSource, /numeric\.toFixed\(2\)/);
}

testCompactControlsMarkup();
testValidationPanelDefaultsToHidden();
testCompactControlsCssContract();

console.log("ui-contract.test.mjs ok");