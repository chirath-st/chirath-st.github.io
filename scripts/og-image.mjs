// Link-preview image (Open Graph) for every page: 1200×630 JPG, photo on the navy panel.
// Usage (from site/): node scripts/og-image.mjs   → writes public/img/og-chirath.jpg
// Text comes from src/data/facts.json only (name + school line), so it stays honest.
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const facts = JSON.parse(readFileSync(resolve(root, 'src/data/facts.json'), 'utf8'));
const f = (p) => pathToFileURL(resolve(root, 'public', p)).href;
const out = resolve(root, 'public/img/og-chirath.jpg');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Newsreader";font-weight:400;src:url("${f('fonts/newsreader-400.woff2')}") format("woff2")}
@font-face{font-family:"Plex";font-weight:400;src:url("${f('fonts/ibm-plex-sans-latin-400-normal.woff2')}") format("woff2")}
@font-face{font-family:"Plex";font-weight:500;src:url("${f('fonts/ibm-plex-sans-latin-500-normal.woff2')}") format("woff2")}
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#0F2147;color:#EEF1F8;display:grid;grid-template-columns:1fr 504px;font-family:"Plex",Arial,sans-serif}
.text{padding:0 64px 0 80px;display:flex;flex-direction:column;justify-content:center;gap:28px}
.rule{width:56px;height:3px;background:#93ACEE}
h1{font-family:"Newsreader",Georgia,serif;font-weight:400;font-size:84px;line-height:1.02;letter-spacing:-.01em}
p{font-size:26px;line-height:1.4;color:#C9D4F6;max-width:520px}
.url{font-size:20px;font-weight:500;letter-spacing:.02em;color:#93ACEE}
img{width:504px;height:630px;object-fit:cover;display:block}
</style></head><body>
<div class="text"><div class="rule"></div><h1>${facts.name}</h1>
<p>${facts.degree.replace(', minor in Computer Science', '')}<br>${facts.school}</p>
<div class="url">chirath-st.github.io</div></div>
<img src="${f('img/chirath-4x5.jpg')}" alt="">
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--allow-file-access-from-files'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
const tmp = mkdtempSync(join(tmpdir(), 'og-'));
writeFileSync(join(tmp, 'og.html'), html);
await page.goto(pathToFileURL(join(tmp, 'og.html')).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log('wrote', out);
