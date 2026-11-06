// Q1.6: runs create-vs-clone.bench.html in headless Chromium and prints the timings.
//   node labs/01-compiled-output/create-vs-clone.bench.mjs   (run from site/'s node_modules: see below)
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Playwright is installed for the site's render tests
const { chromium } = createRequire(path.join(here, '../../site/package.json'))('@playwright/test');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(here, 'create-vs-clone.bench.html')).href);
const lines = await page.waitForFunction(() => window.done, null, { timeout: 120000 });
console.log((await lines.jsonValue()).join('\n'));
console.log(`(${browser.browserType().name()} ${browser.version()})`);
await browser.close();
