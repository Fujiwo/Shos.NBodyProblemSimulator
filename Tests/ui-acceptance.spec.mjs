import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.localStorage?.clear();
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-role="app-root"]')).toBeVisible();
  await expect(page.locator('[data-role="playback-state"]')).toHaveText("Idle");
});

test("compact controls keep short visible text and full accessible names", async ({ page }) => {
  await expect(page.locator('[data-field-wrapper="bodyCount"] > span').first()).toHaveText("Count");
  await expect(page.locator('[data-field-wrapper="timeStep"] > span').first()).toHaveText("dt");
  await expect(page.locator('[data-field-wrapper="softening"] > span').first()).toHaveText("Soft");

  await expect(page.getByLabel("Body Count")).toBeVisible();
  await expect(page.getByLabel("Preset")).toBeVisible();
  await expect(page.getByLabel("Seed")).toBeVisible();
  await expect(page.getByLabel("Time Step")).toBeVisible();
  await expect(page.getByLabel("Softening")).toBeVisible();
  await expect(page.getByLabel("Integrator")).toBeVisible();
  await expect(page.getByLabel("Camera Target")).toBeVisible();
  await expect(page.getByLabel("Trails")).toBeVisible();

  await expect(page.getByRole("button", { name: "Generate" })).toHaveText("Gen");
  await expect(page.getByRole("button", { name: "Start" })).toHaveText("Run");
  await expect(page.getByRole("button", { name: "Pause" })).toHaveText("Hold");
  await expect(page.getByRole("button", { name: "Resume" })).toHaveText("Go");
  await expect(page.getByRole("button", { name: "Reset" })).toHaveText("Reset");

  await expect(page.locator('[data-role="validation-panel"]')).toBeHidden();
  await expect(page.locator('[data-role="metric-integrator"]')).toHaveText("velocity-verlet");
});

test("validation appears only while invalid and start stays blocked", async ({ page }) => {
  const timeStep = page.getByLabel("Time Step");
  const validationPanel = page.locator('[data-role="validation-panel"]');
  const startButton = page.getByRole("button", { name: "Start" });

  await timeStep.evaluate((input, nextValue) => {
    input.value = nextValue;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, "0");

  await expect(validationPanel).toBeVisible();
  await expect(validationPanel).toContainText("Time Step must be greater than 0.");
  await expect(startButton).toBeDisabled();

  await timeStep.evaluate((input, nextValue) => {
    input.value = nextValue;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, "0.01");

  await expect(validationPanel).toBeHidden();
  await expect(startButton).toBeEnabled();
});

test("body cards render single-expand and body inputs lock while running", async ({ page }) => {
  const bodyCards = page.locator('details[data-body-card]');
  const openCards = page.locator('details[data-body-card][open]');

  await expect(bodyCards).toHaveCount(3);
  await expect(openCards).toHaveCount(1);

  const openBodyNameInput = page.locator('details[data-body-card][open] input[data-field="name"]').first();
  await expect(openBodyNameInput).toBeEnabled();

  await page.getByRole("button", { name: "Start" }).click();

  await expect(page.locator('[data-role="playback-state"]')).toHaveText("Running");
  await expect(page.getByLabel("Body Count")).toBeDisabled();
  await expect(page.getByLabel("Integrator")).toBeDisabled();
  await expect(openBodyNameInput).toBeDisabled();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.locator('[data-role="playback-state"]')).toHaveText("Paused");
  await expect(openBodyNameInput).toBeDisabled();

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator('[data-role="playback-state"]')).toHaveText("Idle");
  await expect(page.locator('details[data-body-card][open]')).toHaveCount(1);
  await expect(page.locator('details[data-body-card][open] input[data-field="name"]').first()).toBeEnabled();
});

test.describe("mobile compact layout", () => {
  test.use({ viewport: { width: 360, height: 920 } });

  test("keeps compact controls usable without horizontal overflow", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Controls" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
    await expect(page.locator('[data-role="viewport-canvas"]')).toBeVisible();
    await expect(page.locator('[data-role="body-card-list"]')).toBeVisible();

    const horizontalOverflow = await page.evaluate(() => Math.max(
      document.documentElement.scrollWidth - window.innerWidth,
      document.body.scrollWidth - window.innerWidth
    ));

    expect(horizontalOverflow).toBeLessThanOrEqual(4);
  });
});