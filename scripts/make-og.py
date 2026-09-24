#!/usr/bin/env python3
"""Link-preview images (Open Graph, 1200x630 JPG, <= 150 KB) for every page of the site.

Usage (from anywhere):  python3 scripts/make-og.py
Writes site/public/og/<name>.jpg, where <name> is the page folder with "/" -> "-":
  home.jpg                 /          (also used by 404.html)      navy panel + portrait + name
  cases-<slug>.jpg         /cases/<slug>/                         the case's head photo + case title on a navy band
  tech.jpg                 /tech/                                 dark variant of home
  tech-work-<slug>.jpg     /tech/work/<slug>/                     dark card with the page title
vite.config.js (link-previews plugin) maps each page to the same name, so re-run this after a title or head photo changes.
Text comes only from the pages themselves and src/data/facts.json. Needs Pillow + fontTools (+ brotli) for the site fonts.
"""
import html as htmlmod
import io
import json
import os
import re
import sys
import tempfile
from glob import glob

from PIL import Image, ImageDraw, ImageFont

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(SITE, 'public')
OUT = os.path.join(PUB, 'og')
W, H = 1200, 630
MAX_BYTES = 150 * 1024

NAVY, ON_NAVY, NAVY_RULE, NAVY_SUB = '#0F2147', '#EEF1F8', '#93ACEE', '#C9D4F6'
DARK, DARK_PANEL, DARK_INK, DARK_MUTED, COBALT = '#0B0D10', '#14171C', '#E8EAED', '#9AA3AD', '#4F8CFF'
TINTS = {'commercial-review': COBALT, 'slack-support-desk': '#A78BFA', 'finance-briefing': '#F5B35C', 'deeplob': '#7DD3FC'}
# vertical crop focus for case photos (0 = keep the top, 1 = keep the bottom); the navy band covers the lower part
FOCUS = {'campus-rides': 0.8}
FACE = (232, 120, 512, 400)  # square box around the face in chirath-4x5.jpg (768x960) for the small round portrait

facts = json.load(open(os.path.join(SITE, 'src/data/facts.json'), encoding='utf-8'))
photos = {p['id']: p for p in json.load(open(os.path.join(SITE, 'src/data/photo-credits.json'), encoding='utf-8'))}


# ---------- fonts: the site's own woff2 files, converted once to TTF in a temp folder ----------
_tmp = tempfile.mkdtemp(prefix='og-fonts-')


def font_file(name, variation=None):
    src = os.path.join(PUB, 'fonts', name)
    try:
        from fontTools.ttLib import TTFont
        t = TTFont(src)
        t.flavor = None
        dst = os.path.join(_tmp, name.replace('.woff2', '.ttf'))
        t.save(dst)
        return dst
    except Exception as e:  # clean fallback if fontTools/brotli are missing
        print(f'  ! could not load {name} ({e}); using a system font', file=sys.stderr)
        for f in ['/System/Library/Fonts/Supplemental/Georgia.ttf', '/System/Library/Fonts/Helvetica.ttc',
                  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
            if os.path.exists(f):
                return f
        return None


F_SERIF = font_file('newsreader-400.woff2')
F_SANS = font_file('ibm-plex-sans-latin-400-normal.woff2')
F_SANS_MED = font_file('ibm-plex-sans-latin-500-normal.woff2')
F_MONO = font_file('jetbrains-mono-latin-wght-normal.woff2')


def font(path, size, weight=None):
    f = ImageFont.truetype(path, size) if path else ImageFont.load_default(size)
    if weight:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def wrap(draw, text, fnt, max_w):
    lines, cur = [], ''
    for word in text.split():
        trial = f'{cur} {word}'.strip()
        if draw.textlength(trial, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def fit(draw, text, path, sizes, max_w, max_lines):
    for s in sizes:
        f = font(path, s)
        lines = wrap(draw, text, f, max_w)
        if len(lines) <= max_lines:
            return f, lines, s
    return f, lines, s


def tracked(draw, xy, text, fnt, fill, tracking=0.0):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking


def cover(img, w, h, focus=0.5):
    img = img.convert('RGB')
    s = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    left = (img.width - w) // 2
    top = round((img.height - h) * focus)
    return img.crop((left, top, left + w, top + h))


def save(img, name):
    os.makedirs(OUT, exist_ok=True)
    for q in range(88, 50, -3):
        buf = io.BytesIO()
        img.save(buf, 'JPEG', quality=q, optimize=True, progressive=True, subsampling='4:2:0')
        if buf.tell() <= MAX_BYTES:
            break
    path = os.path.join(OUT, f'{name}.jpg')
    with open(path, 'wb') as fh:
        fh.write(buf.getvalue())
    print(f'  {name}.jpg  {buf.tell() // 1024} KB  q{q}')


def page_text(rel):
    return open(os.path.join(SITE, rel), encoding='utf-8').read()


def clean(s):
    return re.sub(r'\s+', ' ', htmlmod.unescape(re.sub(r'<[^>]+>', '', s))).strip()


def portrait(h=H, w=504):
    return cover(Image.open(os.path.join(PUB, 'img/chirath-4x5.jpg')), w, h, 0.5)


SUBLINE = [facts['degree'].split(',')[0], facts['school']]


# ---------- home (navy) and tech (dark) ----------
def person_card(dark):
    bg, ink, sub, rule = (DARK, DARK_INK, DARK_MUTED, COBALT) if dark else (NAVY, ON_NAVY, NAVY_SUB, NAVY_RULE)
    img = Image.new('RGB', (W, H), bg)
    img.paste(portrait(), (W - 504, 0))
    d = ImageDraw.Draw(img)
    x = 80
    name = font(F_SERIF, 84)
    first, last = facts['name'].split(' ', 1)
    label = font(F_MONO, 18, 500)
    y = 150
    if dark:
        tracked(d, (x, y - 44), 'TECHNICAL EDITION', label, rule, 2.5)
    d.rectangle((x, y, x + 56, y + 3), fill=rule)
    y += 30
    d.text((x, y), first, font=name, fill=ink)
    d.text((x, y + 86), last, font=name, fill=ink)
    y += 86 * 2 + 38
    s = font(F_SANS, 26)
    for i, line in enumerate(SUBLINE):
        d.text((x, y + i * 36), line, font=s, fill=sub)
    url = 'chirath-st.github.io/tech' if dark else 'chirath-st.github.io'
    d.text((x, y + 2 * 36 + 34), url, font=font(F_SANS_MED, 20), fill=rule)
    return img


# ---------- case pages: head photo + title on a navy band ----------
def case_card(rel, slug):
    src = page_text(rel)
    meta = re.search(r'class="case__meta">(.*?)</p>', src, re.S)
    spans = [clean(s) for s in re.findall(r'<span>(.*?)</span>', meta.group(1))] if meta else []
    title = clean(re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S).group(1))
    after = src[src.find('case__title'):]
    pid = re.search(r'<!--@img:([\w-]+)', after) or re.search(r'<!--@img:([\w-]+)', src)
    p = photos[pid.group(1)]
    big = max(p['files'], key=lambda f: f['w'])
    photo = Image.open(os.path.join(PUB, big['src'].lstrip('/')))

    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    x, pad = 64, 44
    tf, lines, size = fit(probe, title, F_SERIF, [56, 52, 48, 44, 40], W - 2 * x, 2)
    lh = round(size * 1.12)
    band_h = pad + 26 + len(lines) * lh + pad - 14
    img = cover(photo, W, H, FOCUS.get(slug, 0.35))
    d = ImageDraw.Draw(img)
    top = H - band_h
    d.rectangle((0, top, W, H), fill=NAVY)
    kicker = ' · '.join(spans[:2]).upper()
    tracked(d, (x, top + pad - 8), kicker, font(F_SANS_MED, 18), NAVY_RULE, 1.6)
    who = font(F_SANS_MED, 18)
    d.text((W - x - d.textlength(facts['name'], font=who), top + pad - 8), facts['name'], font=who, fill=NAVY_SUB)
    y = top + pad + 26
    for i, line in enumerate(lines):
        d.text((x, y + i * lh), line, font=tf, fill=ON_NAVY)
    return img, title, p['id']


# ---------- tech work pages: dark card ----------
def tech_card(rel, slug):
    src = page_text(rel)
    title = clean(re.search(r'<title>(.*?)</title>', src, re.S).group(1))
    title = re.sub(r'\s+[—·-]\s+Chirath Soithong$', '', title)
    tint = TINTS.get(slug, COBALT)
    img = Image.new('RGB', (W, H), DARK)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 10, H), fill=tint)
    x = 80
    tracked(d, (x, 92), 'TECHNICAL EDITION', font(F_MONO, 18, 500), tint, 2.5)
    tf, lines, size = fit(d, title, F_SERIF, [72, 66, 60, 54], W - 2 * x, 3)
    lh = round(size * 1.1)
    y = 150
    d.rectangle((x, y, x + 56, y + 3), fill=tint)
    y += 34
    for i, line in enumerate(lines):
        d.text((x, y + i * lh), line, font=tf, fill=DARK_INK)
    # footer row: round portrait, name, site
    r = 76
    ph = Image.open(os.path.join(PUB, 'img/chirath-4x5.jpg')).convert('RGB')
    s = ph.width / 768  # head-and-shoulders crop, measured on the 768x960 portrait
    ph = ph.crop(tuple(round(v * s) for v in FACE)).resize((r, r), Image.LANCZOS)
    mask = Image.new('L', (r * 4, r * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, r * 4 - 1, r * 4 - 1), fill=255)
    mask = mask.resize((r, r), Image.LANCZOS)
    fy = H - 72 - r
    d.line((x, fy - 34, W - x, fy - 34), fill=DARK_PANEL, width=2)
    img.paste(ph, (x, fy), mask)
    d.text((x + r + 22, fy + 8), facts['name'], font=font(F_SANS_MED, 26), fill=DARK_INK)
    d.text((x + r + 22, fy + 44), 'chirath-st.github.io/tech', font=font(F_SANS, 20), fill=DARK_MUTED)
    return img, title


def main():
    print('home')
    save(person_card(False), 'home')
    print('tech')
    save(person_card(True), 'tech')
    for rel in sorted(glob(os.path.join(SITE, 'cases/*/index.html'))):
        slug = os.path.basename(os.path.dirname(rel))
        img, title, pid = case_card(rel, slug)
        print(f'cases/{slug}: "{title}"  photo={pid}')
        save(img, f'cases-{slug}')
    for rel in sorted(glob(os.path.join(SITE, 'tech/work/*/index.html'))):
        slug = os.path.basename(os.path.dirname(rel))
        img, title = tech_card(rel, slug)
        print(f'tech/work/{slug}: "{title}"')
        save(img, f'tech-work-{slug}')


if __name__ == '__main__':
    main()
