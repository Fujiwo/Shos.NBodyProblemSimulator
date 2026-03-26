import { expect, test } from "@playwright/test";

test.setTimeout(60000);

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
  await expect(page.locator('[data-role="execution-notice"]')).toBeHidden();
  await expect(page.locator('[data-role="metric-integrator"]')).toHaveText("velocity-verlet");
});

test("header stays compact while visualization keeps a tall viewport", async ({ page }) => {
  await expect(page.locator('.app-header')).toBeVisible();
  await expect(page.locator('.viewport-stage')).toBeVisible();
  const headerBox = await page.locator('.app-header').boundingBox();
  const viewportBox = await page.locator('.viewport-stage').boundingBox();

  expect(headerBox).not.toBeNull();
  expect(viewportBox).not.toBeNull();

  expect(headerBox.height).toBeLessThanOrEqual(94);
  expect(viewportBox.height).toBeGreaterThanOrEqual(720);
});

test.describe("responsive layout thresholds", () => {
  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("keeps compact header and usable viewport", async ({ page }) => {
      await expect(page.locator('.app-header')).toBeVisible();
      await expect(page.locator('.viewport-stage')).toBeVisible();

      const headerBox = await page.locator('.app-header').boundingBox();
      const viewportBox = await page.locator('.viewport-stage').boundingBox();

      expect(headerBox).not.toBeNull();
      expect(viewportBox).not.toBeNull();
      await expect(page.locator('.header-copy')).toBeHidden();
      expect(headerBox.height).toBeLessThanOrEqual(126);
      expect(viewportBox.height).toBeGreaterThanOrEqual(470);
    });
  });

  test.describe("tablet", () => {
    test.use({ viewport: { width: 834, height: 1112 } });

    test("increases viewport height without showing header helper copy", async ({ page }) => {
      await expect(page.locator('.app-header')).toBeVisible();
      await expect(page.locator('.viewport-stage')).toBeVisible();

      const headerBox = await page.locator('.app-header').boundingBox();
      const viewportBox = await page.locator('.viewport-stage').boundingBox();

      expect(headerBox).not.toBeNull();
      expect(viewportBox).not.toBeNull();
      await expect(page.locator('.header-copy')).toBeHidden();
      expect(headerBox.height).toBeLessThanOrEqual(126);
      expect(viewportBox.height).toBeGreaterThanOrEqual(640);
    });
  });

  test.describe("wide desktop", () => {
    test.use({ viewport: { width: 1440, height: 1024 } });

    test("restores header helper copy and expands viewport further", async ({ page }) => {
      await expect(page.locator('.app-header')).toBeVisible();
      await expect(page.locator('.viewport-stage')).toBeVisible();

      const headerBox = await page.locator('.app-header').boundingBox();
      const viewportBox = await page.locator('.viewport-stage').boundingBox();

      expect(headerBox).not.toBeNull();
      expect(viewportBox).not.toBeNull();
      await expect(page.locator('.header-copy')).toBeVisible();
      expect(headerBox.height).toBeLessThanOrEqual(104);
      expect(viewportBox.height).toBeGreaterThanOrEqual(820);
    });
  });
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

test("body cards toggle independently and body inputs lock while running", async ({ page }) => {
  const bodyCards = page.locator('details[data-body-card]');
  const openCards = page.locator('details[data-body-card][open]');
  const clickBodyToggle = async (bodyId) => {
    await page.locator(`[data-body-toggle="${bodyId}"]`).dispatchEvent("click");
  };

  await expect(bodyCards).toHaveCount(3);
  await expect(openCards).toHaveCount(1);

  await clickBodyToggle("body-2");
  await expect(page.locator('details[data-body-card][open]')).toHaveCount(2);

  await clickBodyToggle("body-3");
  await expect(page.locator('details[data-body-card][open]')).toHaveCount(3);

  await clickBodyToggle("body-1");
  await expect(page.locator('details[data-body-card][open]')).toHaveCount(2);

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