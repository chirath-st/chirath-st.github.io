import { defineConfig } from 'vite';
import { resolve, dirname, relative, sep } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const readJSON = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Build-time HTML tokens. Everything is resolved at dev and build time, so readers without JavaScript see the same page.
//   <!--@include:name-->         src/partials/name.html (nav, footer, head script…), one file for every page
//   <!--@fact:key.path-->        a string from src/data/facts.json (shared by both editions; works inside attributes too)
//   <!--@img:photo-id attrs-->   an <img> with srcset/width/height/alt from src/data/photo-credits.json.
//                                attrs are passed through (sizes, loading, class…); srcw="192,480" limits the srcset widths.
//   <!--@caption:photo-id-->     the photo's short caption      <!--@credit:photo-id-->  its credit line
//   <!--@page-credits-->         a "Photo credits" list for every photo used on this page (empty when there are none)
// Unknown names or keys throw, so a typo fails the build instead of printing a blank.
function htmlIncludes() {
  const expand = (html) => {
    const facts = readJSON('src/data/facts.json');
    const photos = new Map(readJSON('src/data/photo-credits.json').map((p) => [p.id, p]));
    const photo = (id) => {
      const p = photos.get(id);
      if (!p) throw new Error(`[html-includes] unknown photo "${id}"`);
      return p;
    };

    // 1. partials (a partial may include another one, two levels deep at most)
    for (let i = 0; i < 3 && html.includes('<!--@include:'); i++) {
      html = html.replace(/<!--@include:([\w-]+)-->/g, (_, name) =>
        readFileSync(resolve(root, 'src/partials', `${name}.html`), 'utf8').trim()
      );
    }

    // 2. photo credits for exactly the photos this page shows, in order of first use
    const used = [...new Set([...html.matchAll(/<!--@img:([\w-]+)/g)].map((m) => m[1]))];
    html = html.replace(/<!--@page-credits-->/g, () => {
      if (!used.length) return '';
      const items = used.map((id) => {
        const p = photo(id);
        const lic = p.licence_url ? `<a href="${esc(p.licence_url)}" rel="license noopener">${esc(p.licence)}</a>` : esc(p.licence);
        const changed = /\((cropped[^)]*)\)\s*$/.exec(p.credit); // CC BY: say when the photo was changed
        return `<li><span class="credits__what">${esc(p.caption)}</span> <a href="${esc(p.source_url)}" rel="noopener">${esc(p.author)}</a>, ${lic}, via Wikimedia Commons${changed ? ` (${esc(changed[1])})` : ''}.</li>`;
      });
      return `<details class="credits"><summary>Photo credits</summary><ul class="credits__list">${items.join('')}</ul></details>`;
    });

    // 3. photos, captions, credits
    html = html.replace(/<!--@img:([\w-]+)((?:\s[^>]*?)?)-->/g, (_, id, attrs = '') => {
      const p = photo(id);
      let files = [...p.files].sort((a, b) => a.w - b.w);
      const only = attrs.match(/\ssrcw="([\d,\s]+)"/);
      if (only) {
        const keep = only[1].split(',').map((n) => +n.trim());
        files = files.filter((f) => keep.includes(f.w));
        attrs = attrs.replace(only[0], '');
      } else {
        files = files.filter((f) => f.w >= 480); // the 192w thumbnails are only for the case index
      }
      if (!files.length) throw new Error(`[html-includes] no files left for photo "${id}"`);
      const big = files[files.length - 1];
      const src = (files.find((f) => f.w >= 800) || big).src;
      const srcset = files.map((f) => `${f.src} ${f.w}w`).join(', ');
      const dec = /\sdecoding=/.test(attrs) ? '' : ' decoding="async"';
      const alt = /\salt=/.test(attrs) ? '' : ` alt="${esc(p.alt)}"`; // pass alt="" for a decorative copy
      return `<img src="${src}" srcset="${srcset}" width="${big.w}" height="${big.h}"${alt}${dec}${attrs}>`;
    });
    html = html.replace(/<!--@caption:([\w-]+)-->/g, (_, id) => esc(photo(id).caption));
    html = html.replace(/<!--@credit:([\w-]+)-->/g, (_, id) => esc(photo(id).credit));

    // 4. shared facts
    html = html.replace(/<!--@fact:([\w.]+)-->/g, (_, path) => {
      const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), facts);
      if (v == null || typeof v === 'object') throw new Error(`[html-includes] unknown fact "${path}"`);
      return esc(v);
    });

    const left = html.match(/<!--@[\w-]+:?[^>]*-->/);
    if (left) throw new Error(`[html-includes] unhandled token ${left[0]}`);
    // author notes in <!-- --> comments never ship to the public HTML (conditional comments, if any, are kept)
    return html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
  };

  return {
    name: 'html-includes',
    transformIndexHtml: { order: 'pre', handler: expand },
    // partials and data files are not in the module graph: reload the page when one changes
    handleHotUpdate({ file, server }) {
      if (/[\\/]src[\\/](partials|data)[\\/]/.test(file)) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

// Link previews (LinkedIn, iMessage, WhatsApp, Slack) for every page, built from the page's own <title> and
// <meta name="description">, so no page needs hand-written og tags. Any og:* / twitter:* / canonical tags already in a
// page or partial are removed first: each page ships exactly one set.
// Images: public/og/<name>.jpg, 1200×630, made by `python3 scripts/make-og.py`. <name> is the page folder with "/" → "-"
// ("home" for /, "cases-sales-checks", "tech", "tech-work-deeplob"…); 404 and any page without its own image use home.jpg.
const SITE_URL = 'https://chirath-st.github.io';
function linkPreviews() {
  const decode = (s) =>
    s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
      .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const strip = /[ \t]*<(?:meta\s+(?:property|name)="(?:og|twitter):[^"]*"[^>]*|link\s+rel="canonical"[^>]*)>[ \t]*\r?\n?/gi;

  const homeAlt = () => {
    const f = readJSON('src/data/facts.json');
    return `${f.name}: ${f.degree.split(',')[0]}, ${f.school}`;
  };

  return {
    name: 'link-previews',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const rel = relative(root, ctx.filename || resolve(root, (ctx.path || '/').replace(/^\//, ''))).split(sep).join('/');
        const dir = rel.replace(/(^|\/)index\.html$/, '').replace(/\/$/, '');
        const isNotFound = rel === '404.html';
        const title = html.match(/<title>([\s\S]*?)<\/title>/i);
        const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i);
        if (!title || !desc) throw new Error(`[link-previews] ${rel} needs a <title> and a <meta name="description">`);

        const name = isNotFound || !dir ? 'home' : dir.replace(/\//g, '-');
        const img = existsSync(resolve(root, 'public/og', `${name}.jpg`)) ? name : 'home';
        if (!existsSync(resolve(root, 'public/og', `${img}.jpg`))) throw new Error('[link-previews] public/og/home.jpg is missing: run python3 scripts/make-og.py');
        const url = isNotFound ? `${SITE_URL}/404.html` : `${SITE_URL}/${dir ? `${dir}/` : ''}`;
        const t = esc(decode(title[1].trim()));
        const d = esc(decode(desc[1]));
        const isHome = !dir || dir === 'tech' || isNotFound;

        const tags = [
          !isNotFound && `<link rel="canonical" href="${url}" />`,
          `<meta property="og:site_name" content="Chirath Soithong" />`,
          `<meta property="og:type" content="${isHome ? 'website' : 'article'}" />`,
          `<meta property="og:title" content="${t}" />`,
          `<meta property="og:description" content="${d}" />`,
          `<meta property="og:url" content="${url}" />`,
          `<meta property="og:image" content="${SITE_URL}/og/${img}.jpg" />`,
          `<meta property="og:image:type" content="image/jpeg" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${img === 'home' ? esc(homeAlt()) : t}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          isNotFound && !/<meta\s+name="robots"/i.test(html) && `<meta name="robots" content="noindex" />`,
        ].filter(Boolean);

        html = html.replace(strip, '');
        return html.replace(desc[0], `${desc[0]}\n  ${tags.join('\n  ')}`);
      },
    },
  };
}

const page = (p) => resolve(root, p);

// User site (chirath-st.github.io) is served from the domain root, so base stays '/'.
// Main (light) edition at /, technical (dark) edition at /tech/ (Chirath, Sep 23).
export default defineConfig({
  base: '/',
  appType: 'mpa',
  plugins: [htmlIncludes(), linkPreviews()],
  build: {
    target: 'es2020',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: page('index.html'),
        notFound: page('404.html'),
        caseSalesChecks: page('cases/sales-checks/index.html'),
        caseQuestionsDesk: page('cases/questions-desk/index.html'),
        caseClientData: page('cases/client-data/index.html'),
        caseCampusRides: page('cases/campus-rides/index.html'),
        // "Also made" pages (Sep 27), on the Briefing template v3 (design/STORY_TEMPLATE_v3.md)
        projectMorningBriefing: page('projects/morning-briefing/index.html'),
        projectDailyPlanner: page('projects/daily-planner/index.html'),
        projectResearchReport: page('projects/research-report/index.html'),
        tech: page('tech/index.html'),
        techCommercialReview: page('tech/work/commercial-review/index.html'),
        techSlackSupportDesk: page('tech/work/slack-support-desk/index.html'),
        techFinanceBriefing: page('tech/work/finance-briefing/index.html'),
        techDeeplob: page('tech/work/deeplob/index.html'),
      },
      output: {
        // gsap is shared; Lenis is tech-only, so it gets its own chunk and never ships with the main edition.
        manualChunks: { motion: ['gsap', 'gsap/ScrollTrigger'], lenis: ['lenis'] },
      },
    },
  },
  server: { port: 5173, strictPort: false },
});
