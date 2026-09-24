// Screenshots of the built/dev site. Usage: node scripts/shot.mjs [url] [outDir] [label] [--fold]
// Desktop 1440 full page + fold, wide 1920 fold, phone 390 full page. Uses the installed Chrome.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:5173/';
const outDir = process.argv[3] || '../design/screens';
const label = process.argv[4] || 'shot';
// --reduced: emulate prefers-reduced-motion for every capture, so scroll-built pictures show their finished state
// (use it for full-page comparisons of the main edition; its exhibits are armed "unbuilt" below the fold otherwise).
const REDUCED = process.argv.includes('--reduced');
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });

const targets = [
  { name: 'desktop_1440', viewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, full: true, fold: true },
  { name: 'wide_1920', viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }, full: false, fold: true },
  { name: 'phone_390', viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, full: true, fold: true,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
];

for (const t of targets) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (t.ua) await page.setUserAgent(t.ua);
  if (REDUCED) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport(t.viewport);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);
  if (t.fold) { const f = join(outDir, `${label}_${t.name}_fold.png`); await page.screenshot({ path: f, fullPage: false }); console.log('wrote', f); }
  if (t.full) {
    // walk down the page once so lazy images load, then return to the top
    await page.evaluate(async () => {
      const step = innerHeight * 0.8;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      scrollTo(0, 0);
    });
    await page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }))));
    await sleep(300);
    await page.addStyleTag({ content: '[data-reveal]{opacity:1!important;transform:none!important;transition:none!important}' });
    await sleep(200);
    const f = join(outDir, `${label}_${t.name}.png`);
    if (t.viewport.isMobile) {
      // fullPage + mobile emulation doubles the capture in headless Chrome; size the viewport to the page instead.
      // Chrome caps a capture at 16384 device px; at 2× that is ~8000 CSS px, so stitch clips.
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      const step = 7000;
      const clips = [];
      for (let y = 0; y < h; y += step) clips.push({ x: 0, y, width: t.viewport.width, height: Math.min(step, h - y) });
      if (clips.length === 1) await page.screenshot({ path: f, clip: clips[0], captureBeyondViewport: true });
      else {
        const { default: sharpless } = await import('node:fs');
        const parts = [];
        for (let i = 0; i < clips.length; i++) parts.push(await page.screenshot({ clip: clips[i], captureBeyondViewport: true }));
        // stitch with Python/PIL (available on this Mac) to avoid a Node image dependency
        const { writeFileSync, unlinkSync } = sharpless;
        const tmp = parts.map((b, i) => { const q = `${f}.part${i}.png`; writeFileSync(q, b); return q; });
        const { execSync } = await import('node:child_process');
        execSync(`python3 -c "from PIL import Image;import sys;ps=[Image.open(p) for p in sys.argv[2:]];w=ps[0].width;h=sum(p.height for p in ps);o=Image.new('RGB',(w,h));y=0\nfor p in ps: o.paste(p,(0,y)); y+=p.height\no.save(sys.argv[1])" "${f}" ${tmp.map((q) => `"${q}"`).join(' ')}`);
        tmp.forEach((q) => unlinkSync(q));
      }
    } else {
      await page.screenshot({ path: f, fullPage: true });
    }
    console.log('wrote', f);
  }
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(`  ${t.name}: scrollWidth ${sw} (viewport ${t.viewport.width})${errors.length ? '\n  ERRORS: ' + errors.join(' | ') : ''}`);
  await page.close();
}
await browser.close();
