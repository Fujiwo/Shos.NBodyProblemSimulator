import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const benchmarkDurationMs = Number(process.env.BENCHMARK_DURATION_MS ?? 60000);
const baseUrl = `http://${host}:${port}`;

function startStaticServer() {
  const child = spawn(process.execPath, ["./Tests/support/static-server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PLAYWRIGHT_HOST: host,
      PLAYWRIGHT_PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  return new Promise((resolve, reject) => {
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      if (text.includes("Playwright static server listening")) {
        resolve(child);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("exit", (code) => {
      reject(new Error(`Static server exited early with code ${code}. ${stderr}`));
    });
  });
}

function parseMetricText(metricText) {
  const match = String(metricText).match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
  const numeric = match ? Number.parseFloat(match[0]) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

async function runScenario(page, executionMode) {
  await page.goto(`${baseUrl}/?execution=${executionMode}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Preset").selectOption("random-cluster");
  await page.getByLabel("Body Count").fill("10");
  await page.getByLabel("Body Count").dispatchEvent("change");
  await page.getByLabel("Integrator").selectOption("velocity-verlet");

  const startButton = page.getByRole("button", { name: "Start" });
  await startButton.click();
  await page.waitForTimeout(benchmarkDurationMs);
  await page.getByRole("button", { name: "Pause" }).click();

  const metrics = await page.evaluate(() => ({
    playbackState: document.querySelector('[data-role="playback-state"]')?.textContent?.trim() ?? "",
    fps: document.querySelector('[data-role="metric-fps"]')?.textContent?.trim() ?? "",
    simulationTime: document.querySelector('[data-role="metric-simulation-time"]')?.textContent?.trim() ?? "",
    energyError: document.querySelector('[data-role="metric-energy-error"]')?.textContent?.trim() ?? "",
    pipelineTime: document.querySelector('[data-role="metric-pipeline-time"]')?.textContent?.trim() ?? "",
    integrator: document.querySelector('[data-role="metric-integrator"]')?.textContent?.trim() ?? "",
    statusMessage: document.querySelector('[data-role="status-message"]')?.textContent?.trim() ?? ""
  }));

  return {
    executionMode,
    playbackState: metrics.playbackState,
    fpsText: metrics.fps,
    fps: parseMetricText(metrics.fps),
    simulationTimeText: metrics.simulationTime,
    simulationTime: parseMetricText(metrics.simulationTime),
    energyErrorText: metrics.energyError,
    energyError: parseMetricText(metrics.energyError),
    pipelineTimeText: metrics.pipelineTime,
    pipelineTime: parseMetricText(metrics.pipelineTime),
    integrator: metrics.integrator,
    statusMessage: metrics.statusMessage
  };
}

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const mainResult = await runScenario(page, "main");
  const workerResult = await runScenario(page, "worker");

  console.log(JSON.stringify({
    benchmarkDurationMs,
    scenarios: [mainResult, workerResult]
  }, null, 2));

  await context.close();
} finally {
  await browser.close();
  server.kill("SIGTERM");
}