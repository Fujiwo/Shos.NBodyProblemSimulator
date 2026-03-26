import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseUrl = `http://${host}:${port}`;
const outputDir = path.join(process.cwd(), "Works", "layout-review", "2026-03-26");
const targets = [
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "tablet-834x1112", width: 834, height: 1112 },
  { name: "desktop-1280x960", width: 1280, height: 960 },
  { name: "wide-1440x1024", width: 1440, height: 1024 }
];

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

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });

try {
  await mkdir(outputDir, { recursive: true });

  const captures = [];

  for (const target of targets) {
    const context = await browser.newContext({ viewport: { width: target.width, height: target.height } });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    const headerBox = await page.locator('.app-header').boundingBox();
    const viewportBox = await page.locator('.viewport-stage').boundingBox();

    const filePath = path.join(outputDir, `${target.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true, timeout: 0 });

    captures.push({
      name: target.name,
      width: target.width,
      height: target.height,
      filePath,
      headerHeight: headerBox?.height ?? null,
      viewportHeight: viewportBox?.height ?? null
    });

    await context.close();
  }

  console.log(JSON.stringify({ outputDir, captures }, null, 2));
} finally {
  await browser.close();
  server.kill("SIGTERM");
}