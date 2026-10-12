import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { conformBrowserSite } from '@red-cup-engineering/browser-site-conformance-service';
import { checkpoint } from '../src/checkpoint.mjs';
import { createExperiment, step } from '../src/simulation.mjs';

const root = new URL('..', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };
const chromiumPath = process.env.HOLOFOAM_CHROMIUM;

async function serve() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://local').pathname;
      const file = join(root, 'dist', normalize(pathname).replace(/^[/\\]+/, '') || 'index.html');
      if (!file.startsWith(join(root, 'dist')) || (await stat(file)).isDirectory()) throw new Error('not found');
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      response.end(await readFile(file));
    } catch { response.writeHead(404).end('not found'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

test('the built studio renders and its primary journeys remain operable', async () => {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ ...(chromiumPath ? { executablePath: chromiumPath } : {}), headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    const result = await conformBrowserSite({ browser, origin, paths: ['/'] });
    assert.deepEqual(result.diagnostics, [], JSON.stringify(result.diagnostics));
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(origin, { waitUntil: 'load' });
    await page.locator('#pause').click();
    const tick = await page.locator('#readout').textContent();
    await page.waitForTimeout(80);
    assert.equal(await page.locator('#readout').textContent(), tick);
    await page.locator('#step').click();
    await page.waitForFunction((before) => document.querySelector('#readout')?.textContent !== before, tick);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    await page.locator('[data-tool="pan"]').click();
    await page.mouse.move(box.x + 40, box.y + 40); await page.mouse.down(); await page.mouse.move(box.x + 700, box.y + 400); await page.mouse.up();
    await page.locator('[data-tool="shove"]').click();
    await page.mouse.move(box.x + 40, box.y + 40); await page.mouse.down(); await page.mouse.up();
    assert.deepEqual(errors, []);
    for (const selector of ['#inspect', '#senses', '#what-if', '#capture', '#record', '[data-tool]']) assert.ok(await page.locator(selector).count(), `missing ${selector}`);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('a long current-state checkpoint remains an honest experiment through comparison, saving, loading, export, and PNG capture', async () => {
  const world = createExperiment({ config: { population: 1 } });
  for (let tick = 0; tick < 10_001; tick += 1) step(world);
  world.paused = true;
  const imported = JSON.stringify(checkpoint(world));
  const { server, origin } = await serve();
  const browser = await chromium.launch({ ...(chromiumPath ? { executablePath: chromiumPath } : {}), headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage();
    await page.goto(origin, { waitUntil: 'load' });
    await page.locator('#import').setInputFiles({ name: 'long-state.json', mimeType: 'application/json', buffer: Buffer.from(imported) });
    await page.waitForFunction(() => document.querySelector('#pause')?.textContent === 'Play');
    await page.locator('details').evaluateAll((details) => {
      const target = details.find((entry) => entry.querySelector('summary')?.textContent?.includes('Fork experiment'));
      if (target instanceof HTMLDetailsElement) target.open = true;
    });
    await page.locator('#what-if').click();
    await page.waitForFunction(() => document.querySelector('#comparison')?.textContent?.includes('action changes'));
    await page.locator('details').evaluateAll((details) => {
      const target = details.find((entry) => entry.querySelector('summary')?.textContent?.includes('Lineage and saves'));
      if (target instanceof HTMLDetailsElement) target.open = true;
    });
    await page.locator('#save-name').fill('long-state');
    await page.locator('#save').click();
    await page.locator('#load').click();
    const exported = page.waitForEvent('download');
    await page.locator('#export').click();
    const exportedStream = await (await exported).createReadStream();
    const exportChunks = []; for await (const chunk of exportedStream) exportChunks.push(chunk);
    const exportedState = JSON.parse(Buffer.concat(exportChunks).toString());
    assert.deepEqual({ organisms: exportedState.world.organisms, signals: exportedState.world.signals, genomes: exportedState.world.genomes, rules: exportedState.world.rules }, { organisms: JSON.parse(imported).world.organisms, signals: JSON.parse(imported).world.signals, genomes: JSON.parse(imported).world.genomes, rules: JSON.parse(imported).world.rules });
    const png = page.waitForEvent('download');
    await page.locator('#capture').click();
    const pngData = await (await png).createReadStream();
    const chunks = []; for await (const chunk of pngData) chunks.push(chunk);
    const pixels = await page.evaluate(async (base64) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); const rgb = context.getImageData(0, 0, canvas.width, canvas.height).data; resolve([...rgb].filter((_, index) => index % 4 !== 3).filter((value) => value > 8).length > 32); }; image.onerror = reject; image.src = `data:image/png;base64,${base64}`; }), Buffer.concat(chunks).toString('base64'));
    assert.equal(pixels, true);
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});

test('a downloaded field comparison reopens identically in a fresh browser context', async () => {
  const { server, origin } = await serve();
  const browser = await chromium.launch({ ...(chromiumPath ? { executablePath: chromiumPath } : {}), headless: true });
  try {
    const first = await browser.newContext();
    const page = await first.newPage();
    await page.goto(origin + '/?seed=81', { waitUntil: 'load' });
    await page.locator('#pause').click();
    await page.locator('summary').filter({ hasText: 'Fork experiment' }).click();
    await page.locator('#what-rule').selectOption('whirl');
    await page.locator('#what-if').click();
    const expectedText = await page.locator('#comparison').innerText();
    const expectedView = await page.locator('#fork-view').innerHTML();
    const download = page.waitForEvent('download');
    await page.locator('#export-comparison').click();
    const stream = await (await download).createReadStream();
    const chunks = []; for await (const chunk of stream) chunks.push(chunk);
    const document = Buffer.concat(chunks);
    await page.locator('#step').click();
    await first.close();

    const second = await browser.newContext();
    const receiving = await second.newPage();
    const errors = []; receiving.on('pageerror', (error) => errors.push(error.message));
    await receiving.goto(origin + '/?seed=99', { waitUntil: 'load' });
    await receiving.locator('#import').setInputFiles({ name: 'comparison.json', mimeType: 'application/json', buffer: document });
    await receiving.waitForFunction(() => document.querySelector('#comparison')?.textContent?.includes('ticks:'));
    assert.equal(await receiving.locator('#comparison').innerText(), expectedText);
    assert.equal(await receiving.locator('#fork-view').innerHTML(), expectedView);
    assert.equal(await receiving.locator('#pause').innerText(), 'Play');
    assert.equal(await receiving.locator('#what-rule').inputValue(), 'whirl');
    await receiving.locator('#share').click();
    assert.match(await receiving.locator('#comparison').innerText(), /cannot be a seed-replay link/);
    assert.deepEqual(errors, []);
    await second.close();
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
});
