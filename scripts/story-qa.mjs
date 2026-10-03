// Story-page QA (template v2). Usage, from the repo root:
//   node scripts/story-qa.mjs <url> <outDir> <label> [--widths=1440,390] [--no-scroll] [--no-nojs] [--no-late] [--only=late]
// Per width (1440×900 desktop, 390×844 phone with a mobile UA, like shot.mjs), using the installed Chrome:
//  (a) FINISHED state: reduced motion, every image eager and loaded, page walked once → full-page PNG
//      <label>_finished_<w>.png + a small JPG for phones <label>_finished_<w>-small.jpg (≤ 720 wide, never upscaled;
//      split into -small-1.jpg, -small-2.jpg … when taller than 6000 px; each part under ~600 KB)
//  (b) BLANK AREAS (pixels, python3 + PIL + numpy) on that PNG, inside the content container: two-column rows
//      (.ch, .case__grid, [data-qa-cols]) use their real column boxes, the rest the container's two halves.
//      Reports every run taller than 0.5 × viewport where one side is empty (near-uniform) and the other has
//      content (desktop widths only; phones are one column), and any full-width empty gap taller than 1 viewport.
//  (c) TEXT-ONLY stretches (DOM): inside <main>, runs taller than 1 viewport with no img / svg / canvas / video /
//      picture / [data-visual] of at least 48×48 px. Mark HTML-drawn pictures with data-visual.
//  (d) SCROLL-THROUGH with normal motion: steps of 0.7 × viewport, frames <label>_down_<w>_<nn>.png (≤ 14), then
//      back up through 3 of the same positions: <label>_up_<w>_<nn>.png (same nn = same scroll position).
//      Logs console errors, page errors, failed requests, 4xx/5xx responses, and sideways scroll.
//  (e) JS OFF: full-page PNG <label>_nojs_<w>.png and every element left invisible (opacity 0 or visibility
//      hidden with a non-zero size).
//  (f) LATE ANIMATIONS (nobody should scroll past a picture before it completes): the page is opened with ?qa=1, so
//      every scroll- or time-driven piece lists itself on window.__qaAnims (kit/util.js qaRegister; gsap triggers
//      that are not listed are read from window.__st too, except ids starting "parallax"). For each one, starting
//      with the element below the fold, scroll down to where it must be finished and read its progress:
//        scroll pieces: the top of the element's exhibit (the <figure> around it, title included, else the element) at
//        30 % of the viewport (its centre at the viewport centre if it is taller than the viewport; just before a sticky
//        picture moves on, for a sticky one). Progress < 0.98 → lateAnimations.
//        timed pieces (play once): the element's top at 85 %, then wait its budget (≈ 1.3 s, chats 2.3 s); not
//        finished → lateAnimations.
//      Then scroll back up to the start: a scroll piece above 0.02 → notReversed. An element found more than 4 px from
//      where it was measured (something above it changed height while animating) → layoutDrift.
// Writes <label>_qa.json { blankAreas, textOnly, errors, overflow, nojsInvisible, lateAnimations, notReversed,
// lateSeen (every piece checked, with its reading), files } and prints a summary.
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const flag = (n) => args.find((a) => a.startsWith(`--${n}`));
const [url, outArg, label] = pos;
if (!url || !outArg || !label) {
  console.error('usage: node scripts/story-qa.mjs <url> <outDir> <label> [--widths=1440,390] [--no-scroll] [--no-nojs]');
  process.exit(2);
}
const outDir = resolve(outArg);
mkdirSync(outDir, { recursive: true });
const widths = (flag('widths')?.split('=')[1] || '1440,390').split(',').map(Number);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const view = (w) => (w < 768
  ? { width: w, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
  : { width: w, height: w >= 1920 ? 1080 : 900, deviceScaleFactor: 1 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const files = [];
const report = { url, blankAreas: [], textOnly: [], errors: [], overflow: [], nojsInvisible: [], lateAnimations: [], notReversed: [], layoutDrift: [], files };
const only = flag('only')?.split('=')[1] || '';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars', '--font-render-hinting=none'] });

async function open({ w, reduced = false, js = true, at = url }) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${String(e.message || e).slice(0, 300)}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text().slice(0, 300)}`); });
  page.on('requestfailed', (r) => { if (!/favicon/.test(r.url())) errs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText || ''}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(`http ${r.status()}: ${r.url()}`); });
  const v = view(w);
  if (v.isMobile) await page.setUserAgent(PHONE_UA);
  if (!js) await page.setJavaScriptEnabled(false);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
  await page.setViewport(v);
  await page.goto(at, { waitUntil: 'networkidle0', timeout: 45000 });
  if (js) await page.evaluate(() => document.fonts.ready);
  return { page, errs, v };
}

const scrollToY = (page, y) => page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' }), y);

// full-page PNG by stitching clips (Chrome caps one capture at 16384 px; mobile + fullPage misbehaves in headless)
async function fullShot(page, file) {
  const h = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  const w = page.viewport().width;
  const step = 6000;
  const parts = [];
  for (let y = 0, i = 0; y < h; y += step, i++) {
    const p = `${file}.part${i}.png`;
    await page.screenshot({ path: p, clip: { x: 0, y, width: w, height: Math.min(step, h - y) }, captureBeyondViewport: true });
    parts.push(p);
  }
  execFileSync('python3', ['-c', `
import sys
from PIL import Image
ps=[Image.open(p).convert('RGB') for p in sys.argv[2:]]
o=Image.new('RGB',(ps[0].width,sum(p.height for p in ps)),'white')
y=0
for p in ps:
    o.paste(p,(0,y)); y+=p.height
o.save(sys.argv[1])
`, file, ...parts]);
  parts.forEach((p) => unlinkSync(p));
  return h;
}

// a small JPG to send to a phone: at most 720 wide (never upscaled), split into parts of at most 6000 px tall, and each
// part kept under ~600 KB (quality steps down if needed). One part → <name>.jpg; several → <name>-1.jpg, <name>-2.jpg …
function smallJpg(png, jpg) {
  const out = execFileSync('python3', ['-c', `
import sys, io, json
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB')
w=min(720, im.width); h=round(im.height*w/im.width)
if w!=im.width: im=im.resize((w,h), Image.LANCZOS)
cap=6000; n=max(1,-(-h//cap)); step=-(-h//n)
base=sys.argv[2][:-4]; files=[]
for i in range(n):
    part=im.crop((0,i*step,w,min(h,(i+1)*step)))
    f=sys.argv[2] if n==1 else f'{base}-{i+1}.jpg'
    for q in (72,64,56,48):
        b=io.BytesIO(); part.save(b,'JPEG',quality=q,optimize=True,progressive=True)
        if b.tell()<=600*1024: break
    open(f,'wb').write(b.getvalue()); files.append(f)
print(json.dumps(files))
`, png, jpg]).toString();
  return JSON.parse(out);
}

// pixel check for blank areas (python3 + numpy); geometry comes from the DOM
function blankCheck(png, geo, w) {
  const cfg = JSON.stringify(geo);
  const out = execFileSync('python3', ['-c', `
import sys, json
import numpy as np
from PIL import Image
g=json.loads(sys.argv[2])
im=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.int16)
H=im.shape[0]
y0=max(0,int(g['main'][0])); y1=min(H,int(g['main'][1]))
x0=int(g['wrap'][0]); x1=int(g['wrap'][1]); mid=(x0+x1)//2
vh=g['vh']
# page background: the gutter just left of the container
bg=np.median(im[y0:y1, max(0,x0-10), :],axis=0)
def content(ya,yb,xa,xb):
    seg=im[ya:yb, max(0,xa):max(xa+1,xb), :]
    med=np.median(seg,axis=1)
    diff=np.abs(seg-med[:,None,:]).max(axis=2)
    # content = enough pixels that differ from the row's main colour, or a row filled with a colour that is clearly
    # not the page background (a photo or a solid block); white cards and pale tints on paper still count as empty
    return ((diff>26).sum(axis=1)>=6) | (np.abs(med-bg).max(axis=1)>40)
# per-row column boxes: halves by default, real columns inside two-column rows
L=np.zeros(y1-y0,bool); R=np.zeros(y1-y0,bool); src=np.array(['halves']*(y1-y0),dtype=object)
L[:]=content(y0,y1,x0,mid); R[:]=content(y0,y1,mid,x1)
for gr in g['grids']:
    a=max(y0,int(gr['y0'])); b=min(y1,int(gr['y1']))
    if b-a<4: continue
    (la,lb),(ra,rb)=gr['cols']
    L[a-y0:b-y0]=content(a,b,int(la),int(lb)); R[a-y0:b-y0]=content(a,b,int(ra),int(rb)); src[a-y0:b-y0]=gr['name']
def dil(f,r=28):
    c=np.concatenate([[0],np.cumsum(f.astype(int))])
    n=len(f); i=np.arange(n)
    lo=np.clip(i-r,0,n); hi=np.clip(i+r+1,0,n)
    return (c[hi]-c[lo])>0
Ld=dil(L); Rd=dil(R)
def runs(mask):
    out=[]; start=None
    for i,v in enumerate(list(mask)+[False]):
        if v and start is None: start=i
        if not v and start is not None: out.append((start,i)); start=None
    return out
res={'blank':[], 'gaps':[]}
if g['halves']:
    for side,m in (('left',(~Ld)&Rd),('right',(~Rd)&Ld)):
        for a,b in runs(m):
            if b-a>0.5*vh: res['blank'].append({'side':side,'y0':int(a+y0),'y1':int(b+y0),'h':int(b-a),'where':str(src[a])})
for a,b in runs((~Ld)&(~Rd)):
    if b-a>vh: res['gaps'].append({'y0':int(a+y0),'y1':int(b+y0),'h':int(b-a)})
print(json.dumps(res))
`, png, cfg]).toString();
  const r = JSON.parse(out);
  return [...r.blank.map((b) => ({ width: w, kind: 'one-side-empty', ...b })), ...r.gaps.map((b) => ({ width: w, kind: 'full-width-gap', ...b }))];
}

for (const w of widths) {
  const tag = `${w}`;
  // ---------- (a) finished state ----------
  if (!only || only === 'finished') {
    const { page, errs, v } = await open({ w, reduced: true });
    await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }));
    await page.evaluate(async () => {
      const H = document.documentElement.scrollHeight;
      for (let y = 0; y < H; y += innerHeight * 0.8) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 70)); }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.evaluate(() => Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000); }))));
    await sleep(500);
    const png = join(outDir, `${label}_finished_${tag}.png`);
    await fullShot(page, png);
    const jpg = join(outDir, `${label}_finished_${tag}-small.jpg`);
    files.push(png, ...smallJpg(png, jpg));

    const geo = await page.evaluate((vh) => {
      const Y = (r) => r.top + scrollY;
      const main = document.querySelector('main') || document.body;
      const mr = main.getBoundingClientRect();
      const wrap = main.querySelector('.wrap') || main;
      const wr = wrap.getBoundingClientRect();
      const grids = [];
      document.querySelectorAll('[data-qa-cols], .ch, .case__grid').forEach((g) => {
        const r = g.getBoundingClientRect();
        if (!r.height) return;
        const kids = [...g.children].map((c) => c.getBoundingClientRect()).filter((c) => c.width > 8 && c.height > 8);
        if (kids.length < 2) return;
        kids.sort((a, b) => a.left - b.left);
        const a = kids[0], b = kids.find((k) => k.left >= a.right - 4);
        if (!b) return; // stacked (phones)
        grids.push({ name: g.id ? `#${g.id}` : g.className.split(' ')[0], y0: Y(r), y1: Y(r) + r.height, cols: [[a.left, a.right], [b.left, b.right]] });
      });
      // (c) visuals
      const vis = [...main.querySelectorAll('img, svg, canvas, video, picture, [data-visual]')]
        .map((e) => ({ e, r: e.getBoundingClientRect(), s: getComputedStyle(e) }))
        .filter(({ r, s }) => r.width >= 48 && r.height >= 48 && s.visibility !== 'hidden' && +s.opacity > 0)
        .map(({ r }) => [Y(r), Y(r) + r.height])
        .sort((a, b) => a[0] - b[0]);
      const gaps = [];
      let cur = Y(mr);
      for (const [a, b] of vis) { if (a - cur > vh) gaps.push([cur, a]); cur = Math.max(cur, b); }
      if (Y(mr) + mr.height - cur > vh) gaps.push([cur, Y(mr) + mr.height]);
      return { main: [Y(mr), Y(mr) + mr.height], wrap: [wr.left, wr.right], grids, vh, textGaps: gaps, sw: document.documentElement.scrollWidth, iw: innerWidth };
    }, v.height);
    geo.halves = w >= 961;
    report.blankAreas.push(...blankCheck(png, geo, w));
    report.textOnly.push(...geo.textGaps.map(([a, b]) => ({ width: w, y0: Math.round(a), y1: Math.round(b), h: Math.round(b - a) })));
    if (geo.sw > geo.iw) report.overflow.push({ width: w, mode: 'finished', scrollWidth: geo.sw });
    report.errors.push(...errs.map((e) => `[${w} finished] ${e}`));
    await page.close();
  }

  // ---------- (d) scroll-through with motion ----------
  if (!flag('no-scroll') && (!only || only === 'scroll')) {
    const { page, errs, v } = await open({ w });
    await sleep(1600); // load + idle: the kit boots, pieces near the top arm
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    const stepPx = Math.round(v.height * 0.7);
    const ys = [];
    for (let y = 0; y <= H - v.height; y += stepPx) ys.push(y);
    if (ys[ys.length - 1] < H - v.height) ys.push(H - v.height);
    const keep = new Set();
    const cap = Math.min(14, ys.length);
    for (let i = 0; i < cap; i++) keep.add(Math.round((i * (ys.length - 1)) / Math.max(1, cap - 1)));
    const saved = [];
    let maxSw = 0;
    for (let i = 0; i < ys.length; i++) {
      await scrollToY(page, ys[i]);
      await sleep(keep.has(i) ? 900 : 260);
      if (keep.has(i)) {
        const nn = String(saved.length + 1).padStart(2, '0');
        const f = join(outDir, `${label}_down_${tag}_${nn}.png`);
        await page.screenshot({ path: f });
        files.push(f);
        saved.push({ nn, y: ys[i] });
      }
      maxSw = Math.max(maxSw, await page.evaluate(() => document.documentElement.scrollWidth));
    }
    // back up through three of the same positions (late, middle, early) to compare with the frames going down
    const picks = [...new Set([Math.floor(saved.length * 0.75), Math.floor(saved.length * 0.5), Math.floor(saved.length * 0.25)])]
      .filter((k) => k > 0 && k < saved.length - 1).sort((a, b) => b - a);
    for (const k of picks) {
      await scrollToY(page, saved[k].y + stepPx); // come from below
      await sleep(400);
      await scrollToY(page, saved[k].y);
      await sleep(1100);
      const f = join(outDir, `${label}_up_${tag}_${saved[k].nn}.png`);
      await page.screenshot({ path: f });
      files.push(f);
    }
    if (maxSw > v.width) report.overflow.push({ width: w, mode: 'scroll', scrollWidth: maxSw });
    report.errors.push(...errs.map((e) => `[${w} scroll] ${e}`));
    await page.close();
  }

  // ---------- (e) JS off ----------
  if (!flag('no-nojs') && (!only || only === 'nojs')) {
    const { page, errs } = await open({ w, js: false });
    const png = join(outDir, `${label}_nojs_${tag}.png`);
    await fullShot(page, png);
    files.push(png);
    // evaluate still runs with page scripts off (CDP evaluation), so the DOM can be inspected
    const inv = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      document.querySelectorAll('body *').forEach((e) => {
        if ([...seen].some((s) => s.contains(e))) return;
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        const s = getComputedStyle(e);
        if (+s.opacity === 0 || s.visibility === 'hidden') {
          seen.add(e);
          const cls = typeof e.className === 'string' && e.className ? `.${e.className.trim().split(/\s+/).join('.')}` : '';
          out.push({ el: `${e.tagName.toLowerCase()}${cls}`, why: +s.opacity === 0 ? 'opacity 0' : 'visibility hidden', y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), text: (e.textContent || '').trim().slice(0, 60) });
        }
      });
      return { out, sw: document.documentElement.scrollWidth, iw: innerWidth };
    });
    report.nojsInvisible.push(...inv.out.map((o) => ({ width: w, ...o })));
    if (inv.sw > inv.iw) report.overflow.push({ width: w, mode: 'nojs', scrollWidth: inv.sw });
    report.errors.push(...errs.filter((e) => !/requestfailed/.test(e)).map((e) => `[${w} nojs] ${e}`));
    await page.close();
  }

  // ---------- (f) late animations ----------
  if (!flag('no-late') && (!only || only === 'late')) {
    const { page, errs } = await open({ w, at: url + (url.includes('?') ? '&' : '?') + 'qa=1' });
    // walk the page once, so every piece loads and arms (pieces take over only while off screen), back to the top, and
    // take a snapshot of the list (window.__qaSnap). If the dev server reloads the page meanwhile (another file was
    // saved), the snapshot is gone: do it again and carry on from the same piece.
    let reloads = -1;
    const prepare = async () => {
      reloads++;
      await sleep(1600); // load + idle: the kit boots
      await page.evaluate(async () => {
        const H = document.documentElement.scrollHeight;
        for (let y = 0; y < H; y += innerHeight * 0.5) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 140)); }
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await sleep(900);
      return page.evaluate(() => {
        const list = [...(window.__qaAnims || [])];
        const listed = new Set(list.map((e) => e.st).filter(Boolean));
        (window.__st?.getAll() || []).forEach((st) => {
          if (listed.has(st) || /^parallax/.test(st.vars.id || '') || !(st.animation || st.vars.scrub)) return;
          const t = st.trigger;
          list.push({ el: t, name: `gsap:${t?.id ? `#${t.id}` : (t?.className?.baseVal ?? t?.className ?? '').toString().split(' ')[0]}`, kind: 'scroll', st, progress: () => (st.animation ? st.animation.progress() : st.progress) });
        });
        window.__qaSnap = list;
        return list.length;
      });
    };
    let n = await prepare();
    const alive = () => page.evaluate(() => !!window.__qaSnap).catch(() => false);
    const plan = (i) => page.evaluate((i) => {
      const e = window.__qaSnap[i];
      const vh = innerHeight, max = document.documentElement.scrollHeight - vh;
      // scroll pieces are judged on their whole exhibit (the <figure>, title included), as the reader sees it
      const box = e.kind === 'timed' ? e.el : (e.el.closest('figure') || e.el);
      const r = box.getBoundingClientRect(), top = r.top + scrollY, h = r.height;
      const vis = e.visual || e.el, cs = getComputedStyle(vis);
      let y, rule;
      if (e.kind === 'timed') { const at = e.at ?? 0.85; y = top - at * vh + 12; rule = `top at ${Math.round(at * 100)}% + ${e.budget || 1300} ms`; }
      else if (cs.position === 'sticky') {
        const pr = vis.parentElement.getBoundingClientRect(), pb = parseFloat(getComputedStyle(vis.parentElement).paddingBottom) || 0;
        y = pr.bottom - pb + scrollY - (parseFloat(cs.top) || 0) - vis.offsetHeight - 0.04 * vh;
        rule = 'before its sticky picture moves on';
      } else if (h <= vh) { y = top - 0.3 * vh; rule = 'top at 30%'; }
      else { y = top + h / 2 - vh / 2; rule = 'centre at centre'; }
      const from = top - vh - 20; // the element fully below the fold
      let lt = 0; // layout top (offsets ignore transforms, so a scaled or moving picture does not count as a shift)
      if (e.el.offsetParent !== undefined) for (let m = e.el; m; m = m.offsetParent) lt += m.offsetTop; else lt = top;
      return { name: e.name, kind: e.kind, rule, h: Math.round(h), top: Math.round(top), lt: Math.round(lt), y: Math.round(Math.max(0, Math.min(max, y))), clamped: y > max + 1, from: Math.round(Math.max(0, from)), below: from >= 0, budget: e.budget || 1300 };
    }, i);
    const glide = async (a, b, steps = 8) => { for (let k = 1; k <= steps; k++) { await scrollToY(page, Math.round(a + ((b - a) * k) / steps)); await sleep(40); } };
    const read = (i) => page.evaluate((i) => { const e = window.__qaSnap[i]; return e.kind === 'timed' ? (e.done() ? 1 : 0) : e.progress(); }, i);
    const topNow = (i) => page.evaluate((i) => {
      const el = window.__qaSnap[i].el;
      if (el.offsetParent === undefined) return Math.round(el.getBoundingClientRect().top + scrollY);
      let lt = 0;
      for (let m = el; m; m = m.offsetParent) lt += m.offsetTop;
      return Math.round(lt);
    }, i);
    for (let i = 0; i < n; i++) {
      try {
        if (!(await alive())) {
          if (reloads >= 3) { report.errors.push(`[${w} late] the page kept reloading; stopped at piece ${i + 1} of ${n}`); break; }
          await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 }).catch(() => {});
          n = await prepare();
          if (i >= n) break;
        }
        const pl = await plan(i);
        await scrollToY(page, pl.from);
        await sleep(pl.kind === 'timed' ? 500 : 700);
        await glide(pl.from, pl.y);
        await sleep(pl.kind === 'timed' ? pl.budget : 1300);
        const p = await read(i);
        // the element should be where it was measured: if not, something above it changed height while moving
        const t2 = await topNow(i);
        if (!(await alive())) throw new Error('reloaded');
        (report.lateSeen ||= []).push({ width: w, name: pl.name, kind: pl.kind, rule: pl.rule, progress: +p.toFixed(3), top: pl.top, h: pl.h });
        if (Math.abs(t2 - pl.lt) > 4) report.layoutDrift.push({ width: w, name: pl.name, measured: pl.lt, found: t2 });
        if (p < 0.98) report.lateAnimations.push({ width: w, name: pl.name, kind: pl.kind, rule: pl.rule, progress: +p.toFixed(3), top: pl.top, h: pl.h, ...(pl.clamped ? { note: 'page ends before that point' } : {}) });
        if (pl.kind !== 'timed' && pl.below) {
          await glide(pl.y, pl.from);
          await sleep(1100);
          const q = await read(i);
          if (q > 0.02) report.notReversed.push({ width: w, name: pl.name, progress: +q.toFixed(3), top: pl.top });
        }
      } catch {
        // the page reloaded under us (dev server): take this piece again after preparing the page again
        if (reloads >= 3) { report.errors.push(`[${w} late] the page kept reloading; stopped at piece ${i + 1} of ${n}`); break; }
        await page.evaluate(() => { delete window.__qaSnap; }).catch(() => {});
        i--;
      }
    }
    report.lateChecked = (report.lateChecked || 0) + n;
    if (reloads > 0) report.errors.push(`[${w} late] note: the dev server reloaded the page ${reloads}× during the check (it picked up where it was)`);
    report.errors.push(...errs.map((e) => `[${w} late] ${e}`));
    await page.close();
  }
}
await browser.close();

report.seconds = Math.round((Date.now() - t0) / 1000);
const jsonFile = join(outDir, `${label}_qa.json`);
files.push(jsonFile);
writeFileSync(jsonFile, JSON.stringify(report, null, 2));
const n = (a) => (a.length ? `${a.length} ✗` : '0 ✓');
console.log(`story-qa ${label} · ${url} · ${report.seconds}s`);
console.log(`  blankAreas    ${n(report.blankAreas)}`);
report.blankAreas.forEach((b) => console.log(`    ${b.width}px ${b.kind}${b.side ? ` (${b.side})` : ''} y ${b.y0}–${b.y1} (${b.h}px) ${b.where || ''}`));
console.log(`  textOnly      ${n(report.textOnly)}`);
report.textOnly.forEach((b) => console.log(`    ${b.width}px y ${b.y0}–${b.y1} (${b.h}px)`));
console.log(`  errors        ${n(report.errors)}`);
report.errors.forEach((e) => console.log(`    ${e}`));
console.log(`  overflow      ${n(report.overflow)}`);
report.overflow.forEach((o) => console.log(`    ${o.width}px ${o.mode}: scrollWidth ${o.scrollWidth}`));
console.log(`  lateAnims     ${n(report.lateAnimations)}${report.lateChecked != null ? ` (${report.lateChecked} checked)` : ''}`);
report.lateAnimations.forEach((a) => console.log(`    ${a.width}px ${a.name} (${a.kind}) ${a.progress} at ${a.rule}${a.note ? ` · ${a.note}` : ''} · top ${a.top} h ${a.h}`));
console.log(`  notReversed   ${n(report.notReversed)}`);
report.notReversed.forEach((a) => console.log(`    ${a.width}px ${a.name} still ${a.progress} back at the start · top ${a.top}`));
console.log(`  layoutDrift   ${n(report.layoutDrift)}`);
report.layoutDrift.forEach((a) => console.log(`    ${a.width}px ${a.name} measured at ${a.measured}, found at ${a.found}`));
console.log(`  nojsInvisible ${n(report.nojsInvisible)}`);
report.nojsInvisible.slice(0, 20).forEach((o) => console.log(`    ${o.width}px ${o.el} (${o.why}) y ${o.y} ${o.w}×${o.h} "${o.text}"`));
console.log(`  files: ${files.length} in ${outDir} (json: ${jsonFile})`);
