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

  assert.match(indexHtml, /<span title="Body Count">Count<\/span>/);
  assert.match(indexHtml, /<span title="Time Step">dt<\/span>/);
  assert.match(indexHtml, /<span title="Softening">Soft<\/span>/);
  assert.match(indexHtml, /<span title="Camera Target">Target<\/span>/);
  assert.match(indexHtml, /<span title="Trails">Trail<\/span>/);

  assert.match(indexHtml, /<button data-action="generate" type="button" title="Generate" aria-label="Generate">Gen<\/button>/);
  assert.match(indexHtml, /<button data-action="start" type="button" title="Start" aria-label="Start">Run<\/button>/);
  assert.match(indexHtml, /<button data-action="pause" type="button" title="Pause" aria-label="Pause">Hold<\/button>/);
  assert.match(indexHtml, /<button data-action="resume" type="button" title="Resume" aria-label="Resume">Go<\/button>/);
  assert.match(indexHtml, /<button data-action="reset" type="button" title="Reset" aria-label="Reset">Reset<\/button>/);

  assert.match(indexHtml, /<option value="binary-orbit">Binary<\/option>/);
  assert.match(indexHtml, /<option value="three-body-figure-eight">Figure-8<\/option>/);
  assert.match(indexHtml, /<option value="random-cluster">Random<\/option>/);
}

function testValidationPanelDefaultsToHidden() {
  const indexHtml = readSourceFile("index.html");

  assert.match(indexHtml, /<div class="validation-panel" data-role="validation-panel" aria-live="polite" hidden>/);
  assert.match(indexHtml, /<p class="validation-title">Errors<\/p>/);
}

function testCompactControlsCssContract() {
  const styleCss = readSourceFile("style.css");

  assert.match(styleCss, /\.control-panel \.field input,\s*\n\.control-panel \.field select \{[\s\S]*?min-height: 36px;/);
  assert.match(styleCss, /\.control-panel button \{[\s\S]*?min-height: 36px;/);
  assert.match(styleCss, /\.validation-panel\[hidden\] \{[\s\S]*?display: none;/);
  assert.match(styleCss, /grid-template-columns: minmax\(240px, 300px\) minmax\(0, 1fr\);/);
  assert.match(styleCss, /\.control-panel \.button-grid \{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
}

testCompactControlsMarkup();
testValidationPanelDefaultsToHidden();
testCompactControlsCssContract();

console.log("ui-contract.test.mjs ok");