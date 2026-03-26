import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const benchmarkDurationMs = Number(process.env.BENCHMARK_DURATION_MS ?? 60000);
const outputDir = process.env.BENCHMARK_OUTPUT_DIR ?? path.join(process.cwd(), "Works", "benchmarks", "phase4");
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
    statusMessage: document.querySelector('[data-role="status-message"]')?.textContent?.trim() ?? "",
    executionNotice: document.querySelector('[data-role="execution-notice"]')?.textContent?.trim() ?? ""
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
    statusMessage: metrics.statusMessage,
    executionNotice: metrics.executionNotice
  };
}

function createTimestampLabel(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function createMetricComparison(metricName, baseline, candidate, preferredDirection) {
  const delta = baseline === null || candidate === null ? null : candidate - baseline;
  const ratio = baseline === null || candidate === null || baseline === 0 ? null : candidate / baseline;
  let status = "measured";

  if (baseline === null || candidate === null) {
    status = "missing";
  } else if (delta === 0) {
    status = "unchanged";
  } else if (preferredDirection === "higher") {
    status = delta > 0 ? "improved" : "regressed";
  } else {
    status = delta < 0 ? "improved" : "regressed";
  }

  return {
    metricName,
    preferredDirection,
    baseline,
    candidate,
    delta,
    ratio,
    status
  };
}

function createCiComparisonReport(rawReport) {
  const baseline = rawReport.scenarios.find((scenario) => scenario.executionMode === "main") ?? null;
  const candidate = rawReport.scenarios.find((scenario) => scenario.executionMode === "worker") ?? null;
  const workerFallbackDetected = Boolean(candidate?.executionNotice);

  return {
    schemaVersion: 1,
    generatedAt: rawReport.generatedAt,
    benchmarkDurationMs: rawReport.benchmarkDurationMs,
    outputKind: "phase4-worker-vs-main-comparison",
    conditions: {
      browser: "chromium",
      presetId: "random-cluster",
      bodyCount: 10,
      integrator: "velocity-verlet",
      showTrails: true,
      viewport: {
        width: 1280,
        height: 900
      }
    },
    baseline,
    candidate,
    comparison: {
      fps: createMetricComparison("fps", baseline?.fps ?? null, candidate?.fps ?? null, "higher"),
      simulationTime: createMetricComparison("simulationTime", baseline?.simulationTime ?? null, candidate?.simulationTime ?? null, "higher"),
      energyError: createMetricComparison("energyError", baseline?.energyError ?? null, candidate?.energyError ?? null, "lower"),
      pipelineTime: createMetricComparison("pipelineTime", baseline?.pipelineTime ?? null, candidate?.pipelineTime ?? null, "lower")
    },
    checks: {
      workerFallbackDetected,
      workerExecutionNotice: candidate?.executionNotice ?? "",
      integratorMatched: baseline?.integrator === candidate?.integrator,
      playbackStateMatched: baseline?.playbackState === candidate?.playbackState
    },
    summary: {
      overallStatus: workerFallbackDetected ? "fallback-detected" : "measured",
      notes: workerFallbackDetected
        ? ["Worker runtime fallback occurred. Treat this run as a failed worker benchmark."]
        : ["Worker benchmark completed without fallback."]
    }
  };
}

async function saveBenchmarkReports(rawReport, ciReport) {
  const timestamp = createTimestampLabel(new Date(rawReport.generatedAt));
  await mkdir(outputDir, { recursive: true });

  const rawPath = path.join(outputDir, `phase4-benchmark-${timestamp}.raw.json`);
  const ciPath = path.join(outputDir, `phase4-benchmark-${timestamp}.ci.json`);
  const latestRawPath = path.join(outputDir, "latest.raw.json");
  const latestCiPath = path.join(outputDir, "latest.ci.json");

  await writeFile(rawPath, JSON.stringify(rawReport, null, 2));
  await writeFile(ciPath, JSON.stringify(ciReport, null, 2));
  await writeFile(latestRawPath, JSON.stringify(rawReport, null, 2));
  await writeFile(latestCiPath, JSON.stringify(ciReport, null, 2));

  return {
    rawPath,
    ciPath,
    latestRawPath,
    latestCiPath
  };
}

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const mainResult = await runScenario(page, "main");
  const workerResult = await runScenario(page, "worker");
  const rawReport = {
    generatedAt: new Date().toISOString(),
    benchmarkDurationMs,
    scenarios: [mainResult, workerResult]
  };
  const ciReport = createCiComparisonReport(rawReport);
  const savedFiles = await saveBenchmarkReports(rawReport, ciReport);

  console.log(JSON.stringify({
    ...ciReport,
    savedFiles
  }, null, 2));

  await context.close();
} finally {
  await browser.close();
  server.kill("SIGTERM");
}