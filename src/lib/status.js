// "Running now". Each automation writes a small status.json; the page only reads it.
// Honesty rules (Chirath, Sep 17): no dates on the home page — just the dot and what the tool does.
// Green = a real run finished in the last 48 h. Grey = silent, failed, or not reporting yet.
// Chirath, Sep 23: rows/cards marked data-status-manual are set by hand in the HTML (green until he says a tool is down);
// this script never touches them. The automatic path below stays for when a public status file exists.

const SILENT_AFTER_H = 48;

export const SOURCES = {
  'finance-briefing': {
    url: 'https://raw.githubusercontent.com/chirath-st/finance-briefing/status/status.json',
  },
  'daily-planner': {
    url: null, // not publishing status yet — stays grey with its own note
  },
};

function hoursSince(iso) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (Date.now() - t) / 36e5;
}

async function fetchStatus(id, src) {
  if (!src.url) return null;
  try {
    // A sample file for local testing lives in site/dev-fixtures/status.sample (never shipped).
    const r = await fetch(src.url, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function apply(row, data) {
  const note = row.querySelector('[data-status-note]');
  const live = !!(data && data.ok && hoursSince(data.last_run) <= SILENT_AFTER_H);
  row.classList.toggle('srow--idle', !live);
  if (!note) return live;
  if (live) note.textContent = 'running · reported by the workflow itself';
  else if (data && !data.ok) note.textContent = 'last run failed · grey until it succeeds';
  else if (data) note.textContent = 'silent for more than two days · grey';
  else if (SOURCES[row.dataset.statusRow]?.url) note.textContent = 'no signal yet · grey';
  return live;
}

// Story pages may show a small status card with the real last-run date. Same rules, plus the date.
function applyCard(card, data) {
  const live = !!(data && data.ok && hoursSince(data.last_run) <= SILENT_AFTER_H);
  card.classList.toggle('is-live', live);
  card.classList.toggle('is-idle', !live);
  const last = card.querySelector('[data-status-last]');
  const runs = card.querySelector('[data-status-runs]');
  const note = card.querySelector('[data-status-cardnote]');
  if (last) last.textContent = data && data.last_run ? new Date(data.last_run).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  if (runs) runs.textContent = data && Number.isFinite(data.runs_7d) ? `${data.runs_7d} runs in the last 7 days` : 'no runs reported';
  if (note) note.textContent = live ? 'written by the workflow itself' : data ? (data.ok ? 'silent for more than two days' : 'last run failed') : 'no signal yet';
}

export async function initStatus(list) {
  const cards = [...document.querySelectorAll('[data-status-card]:not([data-status-manual])')];
  for (const card of cards) {
    const id = card.dataset.statusCard;
    applyCard(card, await fetchStatus(id, SOURCES[id] || {}));
  }
  if (!list) return;
  const rows = [...list.querySelectorAll('[data-status-row]:not([data-status-manual])')];
  if (!rows.length) return;
  const results = await Promise.all(rows.map((row) => fetchStatus(row.dataset.statusRow, SOURCES[row.dataset.statusRow] || {})));
  const liveCount = rows.map((row, i) => apply(row, results[i])).filter(Boolean).length;
  const foot = document.querySelector('[data-status-foot]');
  if (foot && liveCount === 0) foot.textContent = 'Nothing has reported a run in the last two days. That is what this section is for: it only turns green when something really ran.';
}
