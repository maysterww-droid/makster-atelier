import { chromium } from 'playwright';

const baseUrl = process.env.DREAM_PLANNER_QA_URL || 'http://127.0.0.1:3000';
const expectedModules = [
  'KITCHEN_BASE_001_BASE_DOOR',
  'KITCHEN_BASE_001_TANDEMBOX',
  'KITCHEN_BASE_001_WOOD_DRAWER',
];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  const consoleErrors = [];
  const assetResponses = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/storage/v1/object/public/makster-library/') || url.includes('/rest/v1/ready_module_library')) {
      assetResponses.push({ url, status: response.status() });
    }
  });

  const response = await page.goto(`${baseUrl}/planner-v3`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (!response?.ok()) throw new Error(`Planner page HTTP ${response?.status()}`);

  await page.waitForFunction(
    () => document.body.innerText.includes('MAKSTER LIBRARY · READY'),
    null,
    { timeout: 45000 },
  );

  const selector = page.locator('select[aria-label="READY module"]');
  await selector.waitFor({ state: 'visible', timeout: 15000 });
  const optionValues = await selector.locator('option').evaluateAll((options) => options.map((option) => option.value));

  for (const moduleCode of expectedModules) {
    if (!optionValues.includes(moduleCode)) throw new Error(`UI selector missing READY module ${moduleCode}`);
    await selector.selectOption(moduleCode);
    await page.waitForFunction(
      (code) => document.body.innerText.includes(`MAKSTER LIBRARY · READY · ${code}`),
      moduleCode,
      { timeout: 15000 },
    );
    await page.waitForTimeout(1200);

    if (moduleCode === 'KITCHEN_BASE_001_BASE_DOOR') {
      await page.getByRole('button', { name: /Фасады/ }).click();
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: /Фасады/ }).click();
    } else {
      await page.getByRole('button', { name: /Ящики/ }).click();
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: /Ящики/ }).click();
    }
  }

  await page.waitForTimeout(1000);

  const badAssetResponses = assetResponses.filter((item) => item.status < 200 || item.status >= 400);
  if (badAssetResponses.length) throw new Error(`Asset HTTP failures: ${JSON.stringify(badAssetResponses)}`);

  const loadedGlbs = new Set(assetResponses.filter((item) => item.url.endsWith('/module.glb') && item.status === 200).map((item) => item.url));
  const loadedMotions = new Set(assetResponses.filter((item) => item.url.endsWith('/motion.json') && item.status === 200).map((item) => item.url));
  if (loadedGlbs.size < expectedModules.length) throw new Error(`Expected ${expectedModules.length} GLB loads, got ${loadedGlbs.size}`);
  if (loadedMotions.size < expectedModules.length) throw new Error(`Expected ${expectedModules.length} motion.json loads, got ${loadedMotions.size}`);

  const fatalConsoleErrors = consoleErrors.filter((text) => !/THREE\.WebGLRenderer|WebGL/i.test(text));
  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  if (fatalConsoleErrors.length) throw new Error(`Console errors: ${fatalConsoleErrors.join(' | ')}`);

  console.log(`UI PASS: ${optionValues.length} READY modules visible`);
  console.log(`UI PASS: ${loadedGlbs.size} GLB files loaded in browser`);
  console.log(`UI PASS: ${loadedMotions.size} motion contracts loaded in browser`);
  console.log('UI PASS: door/drawer open-close controls exercised for all current READY modules');
} finally {
  await browser.close();
}
