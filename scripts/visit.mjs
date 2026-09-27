// Visit a web page like a person: screen-by-screen screenshots while scrolling, plus the page's links.
// Usage: node scripts/visit.mjs <url> <outDir> <label> [desktop|phone]
// Output: <outDir>/<label>_<nn>.png (one per screen, in order), <label>_links.txt, and a summary line.
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [,, url, outDir, label, mode = 'desktop'] = process.argv;
if (!url || !outDir || !label) { console.error('Usage: node scripts/visit.mjs <url> <outDir> <label> [desktop|phone]'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const phone = mode === 'phone';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });
const page = await browser.newPage();
if (phone) {
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
} else {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
}
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 1200));
const vh = phone ? 844 : 900;
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const files = [];
let y = 0, n = 0;
while (y < total && n < 45) {
  await page.evaluate(v => window.scrollTo(0, v), y);
  await new Promise(r => setTimeout(r, 900));
  const f = join(outDir, `${label}_${String(n).padStart(2, '0')}.png`);
  await page.screenshot({ path: f });
  files.push(f);
  y += Math.round(vh * 0.85); n++;
}
const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
  .map(a => `${(a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80)} -> ${a.href}`)
  .filter((v, i, arr) => arr.indexOf(v) === i));
writeFileSync(join(outDir, `${label}_links.txt`), links.join('\n'));
console.log(`${files.length} screens (page is ${(total / vh).toFixed(1)} screens tall). First: ${files[0]}  Last: ${files[files.length - 1]}  Links: ${join(outDir, `${label}_links.txt`)}`);
await browser.close();
