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
  const consoleMessages = [];
  const failedRequests = [];
  const relevantResponses = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on('requestfailed', (request) => failedRequests.push({
    url: request.url(),
    failure: request.failure()?.errorText ?? 'unknown',
  }));
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/storage/v1/object/public/makster-library/') || url.includes('/rest/v1/ready_module_library')) {
      relevantResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] || '' });
    }
  });

  const response = await page.goto(`${baseUrl}/planner-v3`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (!response?.ok()) throw new Error(`Planner page HTTP ${response?.status()}`);

  try {
    await page.waitForFunction(
      () => document.body.innerText.includes('MAKSTER LIBRARY · READY'),
      null,
      { timeout: 15000 },
    );
  } catch (error) {
    console.error('--- UI DIAGNOSTICS BEGIN ---');
    console.error('BODY:', (await page.locator('body').innerText()).slice(0, 12000));
    console.error('CONSOLE:', JSON.stringify(consoleMessages, null, 2));
    console.error('PAGE_ERRORS:', JSON.stringify(pageErrors, null, 2));
    console.error('FAILED_REQUESTS:', JSON.stringify(failedRequests, null, 2));
    console.error('RELEVANT_RESPONSES:', JSON.stringify(relevantResponses, null, 2));
    console.error('ENV_MARKER:', await page.evaluate(() => ({
      hasLibraryReady: document.body.innerText.includes('MAKSTER LIBRARY · READY'),
      hasLibraryConnecting: document.body.innerText.includes('MAKSTER LIBRARY · CONNECTING'),
      hasLibraryOffline: document.body.innerText.includes('MAKSTER LIBRARY · OFFLINE FALLBACK'),
      hasLibraryLocal: document.body.innerText.includes('MAKSTER LIBRARY · LOCAL FALLBACK'),
    })));
    console.error('--- UI DIAGNOSTICS END ---');
    throw error;
  }

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

  const badAssetResponses = relevantResponses.filter((item) => item.status < 200 || item.status >= 400);
  if (badAssetResponses.length) throw new Error(`Asset HTTP failures: ${JSON.stringify(badAssetResponses)}`);

  const loadedGlbs = new Set(relevantResponses.filter((item) => item.url.endsWith('/module.glb') && item.status === 200).map((item) => item.url));
  const loadedMotions = new Set(relevantResponses.filter((item) => item.url.endsWith('/motion.json') && item.status === 200).map((item) => item.url));
  if (loadedGlbs.size < expectedModules.length) throw new Error(`Expected ${expectedModules.length} GLB loads, got ${loadedGlbs.size}`);
  if (loadedMotions.size < expectedModules.length) throw new Error(`Expected ${expectedModules.length} motion.json loads, got ${loadedMotions.size}`);

  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  const fatalConsoleErrors = consoleMessages.filter((text) => text.startsWith('error:') && !/WebGL|THREE\.WebGLRenderer/i.test(text));
  if (fatalConsoleErrors.length) throw new Error(`Console errors: ${fatalConsoleErrors.join(' | ')}`);

  console.log(`UI PASS: ${optionValues.length} READY modules visible`);
  console.log(`UI PASS: ${loadedGlbs.size} GLB files loaded in browser`);
  console.log(`UI PASS: ${loadedMotions.size} motion contracts loaded in browser`);
  console.log('UI PASS: door/drawer open-close controls exercised for all current READY modules');
} finally {
  await browser.close();
}
