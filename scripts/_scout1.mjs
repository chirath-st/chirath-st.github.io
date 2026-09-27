// temp scout script (scout 1, Sep 24). Measures reference sites: height, headings, bg bands, filmstrip frames.
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = process.argv[2];
const sites = JSON.parse(process.argv[3]);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars'] });
const results = {};
for (const [key, url] of Object.entries(sites)) {
  const r = { url };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(e => r.gotoErr = String(e));
    await sleep(3500);
    // try to dismiss cookie banners with a decline/necessary-only button if present
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, a')].find(x => /^(reject|decline|necessary only|only necessary|reject all|deny)/i.test((x.innerText||'').trim()));
      if (b) b.click();
    }).catch(()=>{});
    await sleep(800);
    const frames = [];
    let i = 0, y = 0;
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    while (i < 40) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await sleep(1100);
      const info = await page.evaluate(() => {
        const bgAt = (x, yy) => { let el = document.elementFromPoint(x, yy); while (el) { const c = getComputedStyle(el).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; el = el.parentElement; } return getComputedStyle(document.body).backgroundColor; };
        return { sy: scrollY, bg: bgAt(720, 450), bgL: bgAt(40, 450), H: document.documentElement.scrollHeight };
      });
      const f = `${OUT}/${key}_${String(i).padStart(2,'0')}.jpg`;
      await page.screenshot({ path: f, type: 'jpeg', quality: 55 });
      frames.push(info);
      i++;
      if (y + 900 >= info.H) break;
      y += 900;
    }
    r.frames = frames;
    r.heightDesktop = frames.at(-1)?.H ?? H;
    r.headings = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')].filter(h => h.offsetParent || getComputedStyle(h).position==='fixed').map(h => h.tagName + ' ' + h.innerText.replace(/\s+/g,' ').trim().slice(0, 90)).filter(s => s.length > 3).slice(0, 45));
    r.links = await page.evaluate(() => document.querySelectorAll('a').length);
    await page.close();
    // phone height
    const p = await browser.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    await p.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(()=>{});
    await sleep(2500);
    await p.evaluate(async () => { for (let yy = 0; yy < document.documentElement.scrollHeight; yy += 700) { scrollTo(0, yy); await new Promise(r => setTimeout(r, 120)); } });
    await sleep(800);
    r.heightPhone = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.close();
  } catch (e) { r.err = String(e); }
  results[key] = r;
  console.log(key, r.heightDesktop, r.heightPhone, r.frames?.length, r.err || r.gotoErr || '');
}
writeFileSync(`${OUT}/_measure.json`, JSON.stringify(results, null, 1));
await browser.close();
