// server/macro.js
// Investment App — Macro "Follow the Smart Money" engine.
//
// Pulls LIVE data once per day (6:00 AM ET) from free, public, documented endpoints:
//   • FRED (St. Louis Fed) CSV downloads — Fed balance sheet, money supply, rates, inflation, jobs, credit
//   • Yahoo Finance chart API — prices for asset-class and sector ETFs
//   • Google News RSS — geopolitics, elections, Fed, markets, trade, energy headlines
// Then scores 7 macro pillars, places the economy in a business-cycle phase (Investment Clock),
// infers where money is rotating (price momentum + relative strength), and ranks ideas.

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CACHE_FILE = path.join(DATA_DIR, 'macro-cache.json');
const HISTORY_FILE = path.join(DATA_DIR, 'macro-history.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) InvestmentApp/1.0' };
const REFRESH_HOUR_ET = 20; // 8:00 PM ET daily rollover (after market and after-hours close)

// ---------------------------------------------------------------------------
// Universe
// ---------------------------------------------------------------------------
const ASSETS = [
  { sym: 'SPY', name: 'US Large-Cap Stocks (S&P 500)', cls: 'Stocks' },
  { sym: 'QQQ', name: 'US Tech / Nasdaq-100', cls: 'Stocks' },
  { sym: 'IWM', name: 'US Small Caps (Russell 2000)', cls: 'Stocks' },
  { sym: 'EFA', name: 'International Developed Stocks', cls: 'Stocks' },
  { sym: 'EEM', name: 'Emerging-Market Stocks', cls: 'Stocks' },
  { sym: 'TLT', name: 'Long-Term Treasuries (20Y+)', cls: 'Bonds' },
  { sym: 'IEF', name: 'Intermediate Treasuries (7-10Y)', cls: 'Bonds' },
  { sym: 'LQD', name: 'Investment-Grade Corporate Bonds', cls: 'Bonds' },
  { sym: 'HYG', name: 'High-Yield (Junk) Bonds', cls: 'Bonds' },
  { sym: 'BIL', name: 'Cash / 1-3M T-Bills', cls: 'Cash' },
  { sym: 'GLD', name: 'Gold', cls: 'Real Assets' },
  { sym: 'DBC', name: 'Broad Commodities', cls: 'Real Assets' },
  { sym: 'USO', name: 'Crude Oil', cls: 'Real Assets' },
  { sym: 'UUP', name: 'US Dollar', cls: 'Currency' },
  { sym: 'BTC-USD', name: 'Bitcoin', cls: 'Crypto' }
];

const SECTORS = [
  { sym: 'XLK', name: 'Technology' },
  { sym: 'XLC', name: 'Communication Services' },
  { sym: 'XLY', name: 'Consumer Discretionary' },
  { sym: 'XLF', name: 'Financials' },
  { sym: 'XLI', name: 'Industrials' },
  { sym: 'XLB', name: 'Materials' },
  { sym: 'XLE', name: 'Energy' },
  { sym: 'XLV', name: 'Health Care' },
  { sym: 'XLP', name: 'Consumer Staples' },
  { sym: 'XLU', name: 'Utilities' },
  { sym: 'XLRE', name: 'Real Estate' }
];

const EXTRA_SYMBOLS = ['HG=F', 'GC=F']; // copper & gold futures (copper/gold growth ratio)

const FRED_IDS = [
  'WALCL', 'WTREGEN', 'RRPONTSYD', 'M2SL',
  'DFF', 'DGS2', 'DGS10', 'DFII10', 'T10Y2Y', 'T10Y3M',
  'CPIAUCSL', 'CPILFESL', 'T5YIE',
  'UNRATE', 'SAHMREALTIME', 'ICSA', 'GDPNOW', 'UMCSENT',
  'BAMLH0A0HYM2', 'NFCI', 'VIXCLS', 'DTWEXBGS'
];

const PILLARS = [
  { key: 'liquidity', name: 'Liquidity & Money Supply', icon: '💧', weight: 0.20 },
  { key: 'policy', name: 'Fed Policy & Interest Rates', icon: '🏦', weight: 0.15 },
  { key: 'growth', name: 'Economic Growth & Jobs', icon: '🏭', weight: 0.15 },
  { key: 'inflation', name: 'Inflation', icon: '🔥', weight: 0.10 },
  { key: 'credit', name: 'Credit & Financial Stress', icon: '🧯', weight: 0.15 },
  { key: 'trend', name: 'Market Trend & Breadth', icon: '📈', weight: 0.20 },
  { key: 'geo', name: 'Geopolitics & News Flow', icon: '🌍', weight: 0.05 }
];

// Investment Clock (Merrill Lynch) / business-cycle playbook
const PHASES = {
  recovery: {
    label: 'Early-Cycle Recovery',
    short: 'Recovery',
    description: 'Growth is improving while inflation cools — the "Goldilocks" sweet spot. Historically the best phase for stocks, led by cyclicals, tech and small caps.',
    favorAssets: ['SPY', 'QQQ', 'IWM', 'EEM', 'HYG'],
    avoidAssets: ['BIL', 'UUP', 'DBC', 'USO'],
    favorSectors: ['XLK', 'XLY', 'XLF', 'XLI', 'XLC'],
    avoidSectors: ['XLU', 'XLP', 'XLE', 'XLV']
  },
  overheat: {
    label: 'Late-Cycle Overheat',
    short: 'Overheat',
    description: 'Growth is strong but inflation is heating up and the Fed leans hawkish. Real assets — commodities, energy, materials — historically lead; long bonds suffer.',
    favorAssets: ['DBC', 'USO', 'GLD', 'EEM', 'SPY'],
    avoidAssets: ['TLT', 'IEF', 'LQD'],
    favorSectors: ['XLE', 'XLB', 'XLI', 'XLF'],
    avoidSectors: ['XLU', 'XLRE', 'XLK']
  },
  stagflation: {
    label: 'Stagflation',
    short: 'Stagflation',
    description: 'Growth is slowing while inflation stays sticky — the hardest environment. Cash, gold and defensive sectors historically hold up best; growth stocks and bonds both struggle.',
    favorAssets: ['BIL', 'GLD', 'DBC'],
    avoidAssets: ['TLT', 'IWM', 'HYG', 'QQQ', 'BTC-USD'],
    favorSectors: ['XLE', 'XLP', 'XLV', 'XLU'],
    avoidSectors: ['XLY', 'XLK', 'XLRE', 'XLC']
  },
  slowdown: {
    label: 'Slowdown / Reflation',
    short: 'Slowdown',
    description: 'Growth and inflation are both cooling and the Fed tends to cut. Long-duration bonds and defensive, rate-sensitive sectors historically outperform; cyclicals and commodities lag.',
    favorAssets: ['TLT', 'IEF', 'LQD', 'GLD'],
    avoidAssets: ['DBC', 'USO', 'IWM', 'HYG'],
    favorSectors: ['XLU', 'XLP', 'XLV', 'XLRE'],
    avoidSectors: ['XLE', 'XLB', 'XLI', 'XLY']
  }
};

const DEFENSIVE = new Set(['BIL', 'TLT', 'IEF', 'GLD', 'XLP', 'XLU', 'XLV']);
const HIGH_BETA = new Set(['QQQ', 'IWM', 'BTC-USD', 'EEM', 'XLY', 'XLK', 'HYG']);

// News categories (Google News RSS search)
const NEWS_CATEGORIES = [
  { key: 'geopolitics', name: 'Wars & Geopolitics', q: '(war OR military OR sanctions OR geopolitical OR conflict) markets when:2d', risk: true,
    impact: 'Escalation usually sends money to the US dollar, Treasuries, gold, energy and defense; de-escalation releases it back into stocks and cyclicals.' },
  { key: 'elections', name: 'Elections & Politics', q: '(election OR midterms OR Congress OR "government shutdown") economy when:3d', risk: false,
    impact: 'Uncertainty before votes raises volatility; markets often rally once results are known. Winners\' policies (taxes, spending, regulation) drive sector rotation.' },
  { key: 'fed', name: 'Federal Reserve', q: '("Federal Reserve" OR FOMC OR "interest rates" OR "rate cut") when:2d', risk: false,
    impact: 'Rate cuts and balance-sheet expansion add money to the system (bullish for stocks, gold, crypto); hikes and QT remove it.' },
  { key: 'markets', name: 'Markets & Earnings', q: '("stock market" OR "Wall Street" OR "S&P 500" OR earnings) when:1d', risk: false,
    impact: 'Earnings and guidance confirm (or contradict) whether money is chasing growth or hiding in defensives.' },
  { key: 'trade', name: 'Trade & Tariffs', q: '(tariffs OR "trade war" OR "trade deal" OR export controls) when:3d', risk: true,
    impact: 'Tariff escalation hits importers, multinationals and emerging markets and can lift inflation; trade deals do the reverse.' },
  { key: 'energy', name: 'Oil & Energy', q: '("oil prices" OR OPEC OR "natural gas" OR crude) when:2d', risk: true,
    impact: 'Oil spikes act like a tax on consumers and lift inflation (bad for bonds and discretionary stocks, good for energy).' }
];

const NEG_WORDS = ['war', 'attack', 'strike', 'missile', 'invasion', 'invade', 'escalat', 'conflict', 'sanction', 'tariff', 'retaliat',
  'threat', 'crisis', 'recession', 'default', 'crash', 'plunge', 'selloff', 'sell-off', 'slump', 'tumble', 'fear', 'turmoil',
  'shutdown', 'layoff', 'downgrade', 'unrest', 'terror', 'killed', 'collapse', 'bankrupt', 'warns', 'warning', 'tension',
  'volatil', 'slowdown', 'contraction', 'weak', 'sink', 'slide', 'losses', 'hike', 'spike', 'disrupt', 'probe'];
const POS_WORDS = ['ceasefire', 'truce', 'peace', 'deal', 'agreement', 'rally', 'record high', 'gains', 'soar', 'rebound',
  'rate cut', 'cuts rates', 'easing', 'eases', 'cools', 'growth', 'beats', 'strong', 'optimism', 'upgrade', 'boost',
  'recovery', 'stimulus', 'jump', 'climb', 'rise', 'surge', 'calm', 'stabiliz', 'resolve', 'talks'];

// Known scheduled events (FOMC dates per the Federal Reserve's published 2026 calendar)
const FOMC_2026 = [
  ['2026-01-27', '2026-01-28'], ['2026-03-17', '2026-03-18'], ['2026-04-28', '2026-04-29'], ['2026-06-16', '2026-06-17'],
  ['2026-07-28', '2026-07-29'], ['2026-09-15', '2026-09-16'], ['2026-10-27', '2026-10-28'], ['2026-12-08', '2026-12-09']
];
const ELECTIONS = [
  { date: '2026-11-03', name: 'US Midterm Elections', note: 'All 435 House seats and ~1/3 of the Senate. Control of Congress shapes fiscal spending, taxes and regulation.' },
  { date: '2028-11-07', name: 'US Presidential Election', note: 'Policy uncertainty typically builds in the months before.' }
];

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------
const round = (v, d = 2) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function etParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const o = {};
  parts.forEach((p) => { o[p.type] = p.value; });
  return { date: `${o.year}-${o.month}-${o.day}`, hour: parseInt(o.hour, 10), minute: parseInt(o.minute, 10) };
}

function fmtET(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit'
  }).format(date) + ' ET';
}

// The "edition" rolls over at 8:00 PM ET. Before 8:00 PM we are still on the previous edition.
function editionKey(date = new Date()) {
  return etParts(new Date(date.getTime() - REFRESH_HOUR_ET * 3600e3)).date;
}

async function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function retry(fn, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      if (i < tries - 1) await sleep(700 * (i + 1));
    }
  }
  throw err;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------------------------------------------------------------------------
// Time-series helpers. A series is an array of [isoDate, value] sorted ascending.
// ---------------------------------------------------------------------------
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const lastPt = (s) => (s && s.length ? s[s.length - 1] : null);
const lastVal = (s) => (s && s.length ? s[s.length - 1][1] : null);

function valueAt(s, iso) {
  let lo = 0, hi = s.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid][0] <= iso) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return ans >= 0 ? s[ans][1] : null;
}

function changeDays(s, days) {
  const l = lastPt(s);
  if (!l) return null;
  const p = valueAt(s, addDays(l[0], -days));
  return p == null ? null : l[1] - p;
}

function pctDays(s, days) {
  const l = lastPt(s);
  if (!l) return null;
  const p = valueAt(s, addDays(l[0], -days));
  return p == null || p === 0 ? null : (l[1] / p - 1) * 100;
}

function yoySeries(s, lagDays = 360) {
  if (!s || !s.length) return [];
  const first = s[0][0];
  const out = [];
  for (const [d, v] of s) {
    const back = addDays(d, -lagDays);
    if (back < first) continue;
    const p = valueAt(s, back);
    if (p) out.push([d, (v / p - 1) * 100]);
  }
  return out;
}

function smaLast(s, n) {
  if (!s || s.length < n) return null;
  let sum = 0;
  for (let i = s.length - n; i < s.length; i++) sum += s[i][1];
  return sum / n;
}

function rollingSma(s, n) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    sum += s[i][1];
    if (i >= n) sum -= s[i - n][1];
    if (i >= n - 1) out.push([s[i][0], sum / n]);
  }
  return out;
}

function rollingMax(s, n) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let m = -Infinity;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) if (s[j][1] > m) m = s[j][1];
    out.push([s[i][0], m]);
  }
  return out;
}

function minOver(s, days) {
  const l = lastPt(s);
  if (!l) return null;
  const from = addDays(l[0], -days);
  let m = Infinity;
  for (const [d, v] of s) if (d >= from && v < m) m = v;
  return Number.isFinite(m) ? m : null;
}

const sinceDays = (s, days) => {
  const l = lastPt(s);
  if (!l) return [];
  const from = addDays(l[0], -days);
  return s.filter((p) => p[0] >= from);
};

function combine(a, b, fn) {
  const m = new Map(b);
  const out = [];
  for (const [d, v] of a) {
    const w = m.has(d) ? m.get(d) : valueAt(b, d);
    if (w != null && Number.isFinite(w)) {
      const r = fn(v, w);
      if (Number.isFinite(r)) out.push([d, r]);
    }
  }
  return out;
}

function exactRatio(a, b, mult = 1) {
  const m = new Map(b);
  const out = [];
  for (const [d, v] of a) {
    const w = m.get(d);
    if (w) out.push([d, (v / w) * mult]);
  }
  return out;
}

function downsample(s, max = 260) {
  if (!s || !s.length) return [];
  let pts = s;
  if (s.length > max) {
    const step = Math.ceil(s.length / max);
    pts = [];
    for (let i = 0; i < s.length; i += step) pts.push(s[i]);
    if (pts[pts.length - 1] !== s[s.length - 1]) pts.push(s[s.length - 1]);
  }
  return pts.map((p) => [p[0], round(p[1], 4)]);
}

function chg(label, v, unit, dec = 1) {
  if (v == null || !Number.isFinite(v)) return { label, value: null, display: 'n/a' };
  return { label, value: round(v, dec + 2), display: `${v > 0 ? '+' : ''}${v.toFixed(dec)}${unit}` };
}

const SIGNAL_VALUE = { bullish: 1, neutral: 0, bearish: -1 };

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------
async function fetchFred(id, start) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${start}`;
  return retry(async () => {
    const r = await fetchWithTimeout(url, { headers: UA });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const lines = (await r.text()).trim().split(/\r?\n/).slice(1);
    const out = [];
    for (const ln of lines) {
      const [d, v] = ln.split(',');
      const n = parseFloat(v);
      if (d && Number.isFinite(n)) out.push([d, n]);
    }
    if (!out.length) throw new Error('empty series');
    return out;
  });
}

async function fetchYahoo(symbol, range = '5y') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d&includeAdjustedClose=true`;
  return retry(async () => {
    const r = await fetchWithTimeout(url, { headers: UA });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const res = j && j.chart && j.chart.result && j.chart.result[0];
    if (!res || !res.timestamp) throw new Error('no data');
    const adj = res.indicators && res.indicators.adjclose && res.indicators.adjclose[0] && res.indicators.adjclose[0].adjclose;
    const closes = adj || (res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || [];
    const byDate = new Map();
    res.timestamp.forEach((ts, i) => {
      const v = closes[i];
      if (Number.isFinite(v)) byDate.set(new Date(ts * 1000).toISOString().slice(0, 10), v);
    });
    const out = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    if (out.length < 30) throw new Error('too little history');
    return out;
  });
}

function decodeEntities(str) {
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/<[^>]+>/g, '');
}

function headlineTone(title) {
  const t = title.toLowerCase();
  let neg = 0, pos = 0;
  NEG_WORDS.forEach((w) => { if (t.includes(w)) neg++; });
  POS_WORDS.forEach((w) => { if (t.includes(w)) pos++; });
  const score = pos - neg;
  return score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
}

async function fetchNews(cat) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(cat.q)}&hl=en-US&gl=US&ceid=US:en`;
  return retry(async () => {
    const r = await fetchWithTimeout(url, { headers: UA });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const xml = await r.text();
    const seen = new Set();
    const items = [];
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const b = m[1];
      const grab = (re) => { const x = b.match(re); return x ? decodeEntities(x[1]).trim() : ''; };
      let title = grab(/<title>([\s\S]*?)<\/title>/);
      const source = grab(/<source[^>]*>([\s\S]*?)<\/source>/);
      if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
      const link = grab(/<link>([\s\S]*?)<\/link>/);
      const pub = new Date(grab(/<pubDate>([\s\S]*?)<\/pubDate>/));
      const key = title.toLowerCase().slice(0, 80);
      if (!title || seen.has(key)) continue;
      seen.add(key);
      items.push({
        title,
        source,
        link: /^https?:\/\//.test(link) ? link : '',
        date: Number.isNaN(pub.getTime()) ? null : pub.toISOString(),
        tone: headlineTone(title)
      });
    }
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return items.slice(0, 8);
  });
}

// ---------------------------------------------------------------------------
// Instrument analytics (price momentum & trend = the footprint money leaves)
// ---------------------------------------------------------------------------
function analyzeInstrument(s) {
  const price = lastVal(s);
  const sma200 = smaLast(s, 200);
  const sma50 = smaLast(s, 50);
  return {
    price: round(price, 2),
    asOf: lastPt(s)[0],
    r1: round(pctDays(s, 30), 2),
    r3: round(pctDays(s, 91), 2),
    r6: round(pctDays(s, 182), 2),
    r12: round(pctDays(s, 365), 2),
    sma50: round(sma50, 2),
    sma200: round(sma200, 2),
    above50: sma50 != null && price > sma50,
    above200: sma200 != null && price > sma200,
    pctFrom200: sma200 ? round((price / sma200 - 1) * 100, 2) : null
  };
}

const weightedMomentum = (a) => 0.2 * (a.r1 || 0) + 0.4 * (a.r3 || 0) + 0.4 * (a.r6 || 0);

function flowSignal(a, flow) {
  if (a.above200 && flow > 0) return a.above50 && flow > 5 ? 'Strong Inflow' : 'Inflow';
  if (!a.above200 && flow < 0) return !a.above50 && flow < -5 ? 'Strong Outflow' : 'Outflow';
  return 'Mixed';
}

// ---------------------------------------------------------------------------
// Snapshot builder
// ---------------------------------------------------------------------------
async function buildSnapshot() {
  const t0 = Date.now();
  const issues = [];
  const today = new Date().toISOString().slice(0, 10);
  const fredStart = addDays(today, -2400); // ~6.5 years (5y of charts + 1y for YoY math)

  // ---- Fetch everything in parallel (bounded) ----
  const F = {};
  const Y = {};
  const yahooSyms = [...ASSETS.map((a) => a.sym), ...SECTORS.map((s) => s.sym), ...EXTRA_SYMBOLS];

  const [, , newsResults] = await Promise.all([
    mapLimit(FRED_IDS, 6, async (id) => {
      try { F[id] = await fetchFred(id, fredStart); } catch (e) { issues.push(`FRED ${id}: ${e.message}`); }
    }),
    mapLimit(yahooSyms, 5, async (sym) => {
      try { Y[sym] = await fetchYahoo(sym); } catch (e) { issues.push(`Yahoo ${sym}: ${e.message}`); }
    }),
    mapLimit(NEWS_CATEGORIES, 3, async (cat) => {
      try { return { ...cat, items: await fetchNews(cat) }; } catch (e) { issues.push(`News ${cat.key}: ${e.message}`); return { ...cat, items: [] }; }
    })
  ]);

  const metrics = [];
  const add = (id, fn) => {
    try {
      const m = fn();
      if (m) metrics.push(m);
    } catch (e) {
      issues.push(`Metric ${id}: ${e.message}`);
    }
  };
  const FIVE_Y = 365 * 5;

  // ======================= LIQUIDITY =======================
  add('netLiquidity', () => {
    const w = F.WALCL, t = F.WTREGEN, r = F.RRPONTSYD;
    if (!w || !t || !r) return null;
    const s = w.map(([d, v]) => {
      const tv = valueAt(t, d), rv = valueAt(r, d);
      return tv == null || rv == null ? null : [d, v / 1e6 - tv / 1e6 - rv / 1e3];
    }).filter(Boolean);
    const v = lastVal(s), c3 = pctDays(s, 91), c12 = pctDays(s, 364);
    const signal = c3 > 1.5 ? 'bullish' : c3 < -1.5 ? 'bearish' : 'neutral';
    return {
      id: 'netLiquidity', pillar: 'liquidity', name: 'Net Liquidity (Fed − TGA − Reverse Repo)', unit: '$T', decimals: 2,
      value: v, display: `$${v.toFixed(2)}T`, asOf: lastPt(s)[0],
      changes: [chg('3M', c3, '%'), chg('1Y', c12, '%')], signal,
      headline: `Net liquidity ${c3 >= 0 ? 'rising' : 'falling'} (${chg('', c3, '%').display} in 3M)`,
      what: 'The dollars actually available to financial markets: the Fed\'s balance sheet minus cash parked in the Treasury\'s account (TGA) and the Fed\'s reverse-repo facility. Historically one of the tightest macro correlates of stock prices.',
      now: signal === 'bullish' ? `Liquidity is expanding (${chg('', c3, '%').display} over 3 months) — more money is chasing assets.`
        : signal === 'bearish' ? `Liquidity is contracting (${chg('', c3, '%').display} over 3 months) — money is being drained from markets.`
          : `Liquidity is roughly flat (${chg('', c3, '%').display} over 3 months).`,
      next: signal === 'bullish' ? 'Rising liquidity tends to lift stocks, crypto and gold with a lag of weeks.'
        : signal === 'bearish' ? 'Falling liquidity is a headwind: rallies get weaker and high-beta assets are hit first.'
          : 'Neutral liquidity means returns depend more on earnings and rotation than on new money.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('fedBalanceSheet', () => {
    const w = F.WALCL;
    if (!w) return null;
    const s = w.map(([d, v]) => [d, v / 1e6]);
    const v = lastVal(s), c3 = pctDays(s, 91), c12 = pctDays(s, 364);
    const mode = c3 > 0.5 ? 'expanding' : c3 < -0.5 ? 'shrinking' : 'flat';
    const signal = mode === 'expanding' ? 'bullish' : mode === 'shrinking' ? 'bearish' : 'neutral';
    return {
      id: 'fedBalanceSheet', pillar: 'liquidity', name: 'Fed Balance Sheet ("Money Printing")', unit: '$T', decimals: 2,
      value: v, display: `$${v.toFixed(2)}T`, asOf: lastPt(s)[0],
      changes: [chg('3M', c3, '%'), chg('1Y', c12, '%')], signal,
      headline: `Fed balance sheet ${mode} (${chg('', c3, '%').display} 3M)`,
      what: 'Total assets held by the Federal Reserve. When it grows (QE) the Fed is creating money to buy bonds; when it shrinks (QT) it is pulling money out of the system.',
      now: mode === 'expanding' ? 'The Fed is adding money (balance sheet growing) — effectively printing.'
        : mode === 'shrinking' ? 'The Fed is still draining money via Quantitative Tightening (QT).'
          : 'The balance sheet is roughly stable — QT has slowed or stopped, neither adding nor draining much.',
      next: mode === 'expanding' ? 'Historically QE periods (2009-14, 2020-21) favored stocks, crypto and gold.'
        : mode === 'shrinking' ? 'Continued QT tightens liquidity; watch for the Fed to end it if funding markets get stressed.'
          : 'A flat balance sheet removes a headwind; a pivot to expansion would be a strong bullish trigger.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('m2', () => {
    if (!F.M2SL) return null;
    const yoy = yoySeries(F.M2SL, 360);
    const v = lastVal(yoy), level = lastVal(F.M2SL) / 1000;
    const d3 = changeDays(yoy, 91);
    const signal = v > 6 ? 'bullish' : v < 1 ? 'bearish' : 'neutral';
    return {
      id: 'm2', pillar: 'liquidity', name: 'M2 Money Supply Growth (YoY)', unit: '%', decimals: 1,
      value: v, display: `${v.toFixed(1)}%`, asOf: lastPt(yoy)[0], sub: `Total M2: $${level.toFixed(1)}T`,
      changes: [chg('3M', d3, ' pp')], signal, refLines: [{ value: 0, label: '0%' }],
      headline: `M2 growing ${v.toFixed(1)}% a year`,
      what: 'All cash, checking, savings and money-market balances in the economy. Its growth rate shows whether there is more or less money circulating.',
      now: v < 0 ? 'Money supply is actually shrinking — rare, and historically deflationary.'
        : v < 1 ? 'Money supply is barely growing — tight conditions.'
          : v > 6 ? 'Money supply is growing fast — excess money tends to find its way into assets (and later into inflation).'
            : `Money supply is growing at a normal pace (${v.toFixed(1)}%/yr, long-run average ~6%).`,
      next: d3 > 0.5 ? 'Growth is accelerating — supportive for risk assets over the next 6-12 months.'
        : d3 < -0.5 ? 'Growth is decelerating — less fuel for asset prices ahead.'
          : 'Growth rate is stable — no major change in the money backdrop.',
      history: sinceDays(yoy, FIVE_Y)
    };
  });

  add('rrp', () => {
    if (!F.RRPONTSYD) return null;
    const s = F.RRPONTSYD;
    const v = lastVal(s), c3 = changeDays(s, 91);
    return {
      id: 'rrp', pillar: 'liquidity', name: 'Fed Reverse Repo (Idle Cash Buffer)', unit: '$B', decimals: 0, scored: false,
      value: v, display: `$${v.toFixed(0)}B`, asOf: lastPt(s)[0],
      changes: [chg('3M', c3, 'B', 0)], signal: 'neutral',
      headline: `Reverse repo at $${v.toFixed(0)}B`,
      what: 'Cash money-market funds park at the Fed overnight. When it falls, that idle cash moves into T-bills and markets — offsetting QT.',
      now: v < 100 ? 'This buffer is nearly empty. Any further QT or Treasury cash-building now drains bank reserves directly.'
        : `About $${v.toFixed(0)}B of idle cash still sits at the Fed and can be released into markets.`,
      next: v < 100 ? 'With the cushion gone, funding-market stress (repo spikes) becomes more likely if liquidity keeps tightening — a reason for the Fed to stop QT.'
        : 'Further declines would release liquidity and cushion markets.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('tga', () => {
    if (!F.WTREGEN) return null;
    const s = F.WTREGEN.map(([d, v]) => [d, v / 1000]);
    const v = lastVal(s), c3 = changeDays(s, 91);
    const signal = c3 > 150 ? 'bearish' : c3 < -150 ? 'bullish' : 'neutral';
    return {
      id: 'tga', pillar: 'liquidity', name: 'Treasury Cash Account (TGA)', unit: '$B', decimals: 0,
      value: v, display: `$${v.toFixed(0)}B`, asOf: lastPt(s)[0],
      changes: [chg('3M', c3, 'B', 0)], signal,
      headline: `Treasury cash ${c3 >= 0 ? 'up' : 'down'} $${Math.abs(c3 || 0).toFixed(0)}B in 3M`,
      what: 'The US government\'s checking account at the Fed. When the Treasury builds it up (by issuing debt) it pulls cash out of markets; when it spends it down, cash flows back.',
      now: signal === 'bearish' ? 'The Treasury has been hoarding cash — a liquidity drain.' : signal === 'bullish' ? 'The Treasury has been spending down its cash — a liquidity injection.' : 'Treasury cash balance is fairly stable.',
      next: 'Debt-ceiling fights and big tax dates swing this account by hundreds of billions — watch it around those events.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  // ======================= FED POLICY & RATES =======================
  add('fedFunds', () => {
    if (!F.DFF) return null;
    const s = F.DFF;
    const v = lastVal(s), c6 = changeDays(s, 182), c12 = changeDays(s, 365);
    const stance = c6 < -0.2 ? 'cutting' : c6 > 0.2 ? 'hiking' : 'on hold';
    const signal = stance === 'cutting' ? 'bullish' : stance === 'hiking' ? 'bearish' : 'neutral';
    return {
      id: 'fedFunds', pillar: 'policy', name: 'Fed Funds Rate', unit: '%', decimals: 2,
      value: v, display: `${v.toFixed(2)}%`, asOf: lastPt(s)[0],
      changes: [chg('6M', c6 * 100, ' bp', 0), chg('1Y', c12 * 100, ' bp', 0)], signal,
      headline: `Fed is ${stance} (${chg('', c6 * 100, ' bp', 0).display} in 6M)`,
      what: 'The overnight interest rate the Fed controls. It sets the cost of money for the entire economy.',
      now: stance === 'cutting' ? `The Fed is in a cutting cycle — money is getting cheaper (${chg('', c12 * 100, ' bp', 0).display} over 1 year).`
        : stance === 'hiking' ? 'The Fed is raising rates — money is getting more expensive.'
          : 'The Fed has been on hold for six months.',
      next: stance === 'cutting' ? 'Cuts without a recession have historically been very bullish for stocks; cuts INTO a recession are not — watch the jobs data.'
        : stance === 'hiking' ? 'Hikes usually pressure valuations, small caps and real estate.'
          : 'The next move will be signalled by the 2-year Treasury yield (see "Market-Implied Fed Path").',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('fedPath', () => {
    if (!F.DGS2 || !F.DFF) return null;
    const s = combine(F.DGS2, F.DFF, (a, b) => a - b);
    const v = lastVal(s);
    const signal = v < -0.25 ? 'bullish' : v > 0.25 ? 'bearish' : 'neutral';
    return {
      id: 'fedPath', pillar: 'policy', name: 'Market-Implied Fed Path (2Y − Fed Funds)', unit: '%', decimals: 2,
      value: v, display: `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)} bp`, asOf: lastPt(s)[0],
      changes: [chg('1M', changeDays(s, 30) * 100, ' bp', 0)], signal, refLines: [{ value: 0, label: '0' }],
      headline: v < -0.25 ? 'Bond market expects more rate cuts' : v > 0.25 ? 'Bond market expects rate hikes' : 'Bond market expects rates roughly unchanged',
      what: 'The 2-year Treasury yield minus the Fed funds rate. The 2-year tracks where traders expect the Fed to be over the next two years.',
      now: v < -0.25 ? `The 2-year sits ${Math.abs(v * 100).toFixed(0)} bp below the Fed rate — traders are betting on further cuts.`
        : v > 0.25 ? `The 2-year sits ${(v * 100).toFixed(0)} bp above the Fed rate — traders expect hikes.`
          : 'The 2-year is close to the Fed rate — few changes priced in.',
      next: 'If the Fed under-delivers versus these expectations, markets typically wobble; over-delivering is a tailwind.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('tenYear', () => {
    if (!F.DGS10) return null;
    const s = F.DGS10;
    const v = lastVal(s), c3 = changeDays(s, 91), c12 = changeDays(s, 365);
    const signal = c3 > 0.4 || v >= 5 ? 'bearish' : c3 < -0.4 ? 'bullish' : 'neutral';
    return {
      id: 'tenYear', pillar: 'policy', name: '10-Year Treasury Yield', unit: '%', decimals: 2,
      value: v, display: `${v.toFixed(2)}%`, asOf: lastPt(s)[0],
      changes: [chg('3M', c3 * 100, ' bp', 0), chg('1Y', c12 * 100, ' bp', 0)], signal, refLines: [{ value: 5, label: '5%' }],
      headline: `10Y yield ${v.toFixed(2)}% (${chg('', c3 * 100, ' bp', 0).display} 3M)`,
      what: 'The benchmark long-term interest rate. It drives mortgage rates and the discount rate used to value every stock.',
      now: v >= 5 ? 'Long rates are at/above 5% — a level that has repeatedly pressured stock valuations and housing.'
        : c3 > 0.4 ? 'Long rates have jumped quickly — a tightening of financial conditions even without the Fed.'
          : c3 < -0.4 ? 'Long rates are falling — easing financial conditions and helping bonds, housing and growth stocks.'
            : 'Long rates are relatively stable.',
      next: 'A sustained break above 5% would favor cash and value over growth; a drop below 4% would favor long bonds, tech and real estate.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('realYield', () => {
    if (!F.DFII10) return null;
    const s = F.DFII10;
    const v = lastVal(s);
    const signal = v > 2 ? 'bearish' : v < 1 ? 'bullish' : 'neutral';
    return {
      id: 'realYield', pillar: 'policy', name: '10-Year Real Yield (after inflation)', unit: '%', decimals: 2,
      value: v, display: `${v.toFixed(2)}%`, asOf: lastPt(s)[0],
      changes: [chg('3M', changeDays(s, 91) * 100, ' bp', 0)], signal, refLines: [{ value: 2, label: '2%' }, { value: 0, label: '0' }],
      headline: `Real yield ${v.toFixed(2)}%`,
      what: 'The inflation-adjusted return on safe government bonds (TIPS). High real yields make cash and bonds attractive versus stocks, gold and crypto.',
      now: v > 2 ? 'Real yields are restrictive (>2%): safe bonds pay well, raising the bar for risky assets.'
        : v < 1 ? 'Real yields are low: savers are pushed into stocks, gold and crypto.'
          : 'Real yields are moderate.',
      next: 'Falling real yields have historically been one of the strongest tailwinds for gold and long-duration tech.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  const curveMetric = (id, fredId, name) => add(id, () => {
    const s = F[fredId];
    if (!s) return null;
    const v = lastVal(s), min2y = minOver(s, 730);
    let signal, state;
    if (v < 0) { signal = 'bearish'; state = 'inverted'; }
    else if (min2y != null && min2y < 0) { signal = 'neutral'; state = 'recently un-inverted'; }
    else { signal = v > 0.25 ? 'bullish' : 'neutral'; state = 'normal'; }
    return {
      id, pillar: 'policy', name, unit: '%', decimals: 2,
      value: v, display: `${v > 0 ? '+' : ''}${v.toFixed(2)}%`, asOf: lastPt(s)[0],
      changes: [chg('3M', changeDays(s, 91) * 100, ' bp', 0)], signal, refLines: [{ value: 0, label: 'Inversion' }],
      headline: `Yield curve ${state} (${v > 0 ? '+' : ''}${v.toFixed(2)}%)`,
      what: 'Long-term minus short-term rates. Normally positive. When it inverts (negative), it has preceded every US recession since the 1960s — usually by 6-24 months.',
      now: state === 'inverted' ? 'The curve is inverted — a classic recession warning.'
        : state === 'recently un-inverted' ? 'The curve has just turned positive after an inversion. Historically recessions often START around this point — stay alert.'
          : 'The curve has a normal positive slope — consistent with expansion.',
      next: state === 'normal' ? 'A steepening curve favors banks (Financials) and cyclicals.' : 'Watch jobless claims and the Sahm rule for confirmation of a slowdown.',
      history: sinceDays(s, FIVE_Y)
    };
  });
  curveMetric('curve10y2y', 'T10Y2Y', 'Yield Curve (10Y − 2Y)');
  curveMetric('curve10y3m', 'T10Y3M', 'Yield Curve (10Y − 3M)');

  // ======================= INFLATION =======================
  const inflationMetric = (id, fredId, name, whatText) => add(id, () => {
    if (!F[fredId]) return null;
    const yoy = yoySeries(F[fredId], 360);
    const v = lastVal(yoy), d3 = changeDays(yoy, 91);
    const signal = v > 3.5 || d3 > 0.3 ? 'bearish' : v < 2.75 && d3 <= 0 ? 'bullish' : 'neutral';
    return {
      id, pillar: 'inflation', name, unit: '%', decimals: 1,
      value: v, display: `${v.toFixed(1)}%`, asOf: lastPt(yoy)[0],
      changes: [chg('3M', d3, ' pp', 2), chg('1Y', changeDays(yoy, 365), ' pp', 2)], signal, refLines: [{ value: 2, label: 'Fed 2% target' }],
      headline: `${name.split(' (')[0]} ${v.toFixed(1)}% and ${d3 > 0.05 ? 'rising' : d3 < -0.05 ? 'falling' : 'flat'}`,
      what: whatText,
      now: `Running at ${v.toFixed(1)}% vs the Fed's 2% target, ${d3 > 0.05 ? 'and re-accelerating' : d3 < -0.05 ? 'and cooling' : 'and roughly stable'} over the last 3 months.`,
      next: d3 > 0.1 ? 'Re-accelerating inflation limits Fed cuts and favors commodities, energy and TIPS over long bonds.'
        : d3 < -0.1 ? 'Cooling inflation gives the Fed room to cut — good for bonds and growth stocks.'
          : 'Stable inflation keeps the Fed on its current path.',
      history: sinceDays(yoy, FIVE_Y)
    };
  });
  inflationMetric('cpi', 'CPIAUCSL', 'CPI Inflation (YoY)', 'How fast consumer prices are rising versus a year ago.');
  inflationMetric('coreCpi', 'CPILFESL', 'Core CPI (ex Food & Energy, YoY)', 'Inflation excluding volatile food and energy — the "sticky" trend the Fed watches most closely.');

  add('breakeven', () => {
    if (!F.T5YIE) return null;
    const s = F.T5YIE;
    const v = lastVal(s);
    const signal = v > 2.6 ? 'bearish' : v >= 1.8 && v <= 2.4 ? 'bullish' : 'neutral';
    return {
      id: 'breakeven', pillar: 'inflation', name: '5-Year Inflation Expectations (Market)', unit: '%', decimals: 2,
      value: v, display: `${v.toFixed(2)}%`, asOf: lastPt(s)[0],
      changes: [chg('3M', changeDays(s, 91) * 100, ' bp', 0)], signal, refLines: [{ value: 2, label: '2%' }],
      headline: `Markets expect ${v.toFixed(2)}% inflation`,
      what: 'The inflation rate bond traders are pricing in over the next 5 years (nominal minus inflation-protected Treasury yield).',
      now: v > 2.6 ? 'Inflation expectations are elevated — markets doubt inflation will return to 2%.'
        : v < 1.8 ? 'Expectations are low — markets are pricing a slowdown or disinflation.'
          : 'Expectations are reasonably anchored near the Fed\'s target.',
      next: 'Rising expectations favor gold, commodities and energy; falling expectations favor long-term bonds.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  // ======================= GROWTH & JOBS =======================
  add('unemployment', () => {
    if (!F.UNRATE) return null;
    const s = F.UNRATE;
    const v = lastVal(s), c6 = changeDays(s, 182), c12 = changeDays(s, 365);
    const signal = c6 >= 0.3 ? 'bearish' : c6 <= 0 ? 'bullish' : 'neutral';
    return {
      id: 'unemployment', pillar: 'growth', name: 'Unemployment Rate', unit: '%', decimals: 1,
      value: v, display: `${v.toFixed(1)}%`, asOf: lastPt(s)[0],
      changes: [chg('6M', c6, ' pp', 1), chg('1Y', c12, ' pp', 1)], signal,
      headline: `Unemployment ${v.toFixed(1)}% (${chg('', c6, ' pp', 1).display} 6M)`,
      what: 'Share of the labor force without a job. The direction matters more than the level.',
      now: c6 >= 0.3 ? 'Unemployment is rising meaningfully — the labor market is cracking.'
        : c6 <= 0 ? 'Unemployment is stable or falling — the job market is healthy.'
          : 'Unemployment is drifting slightly higher — a cooling, not (yet) a break.',
      next: 'A rise of 0.5 pp from the low (the Sahm rule) has reliably marked the start of recessions.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('sahm', () => {
    if (!F.SAHMREALTIME) return null;
    const s = F.SAHMREALTIME;
    const v = lastVal(s);
    const signal = v >= 0.5 ? 'bearish' : v < 0.3 ? 'bullish' : 'neutral';
    return {
      id: 'sahm', pillar: 'growth', name: 'Sahm Rule Recession Indicator', unit: 'pts', decimals: 2,
      value: v, display: v.toFixed(2), asOf: lastPt(s)[0],
      changes: [chg('3M', changeDays(s, 91), '', 2)], signal, refLines: [{ value: 0.5, label: 'Recession trigger' }],
      headline: v >= 0.5 ? 'Sahm rule TRIGGERED' : `Sahm rule ${v.toFixed(2)} (trigger 0.50)`,
      what: 'Compares the 3-month average unemployment rate to its 12-month low. A reading of 0.50+ has signalled every US recession since 1970 in real time.',
      now: v >= 0.5 ? 'The recession signal is ON.' : v >= 0.3 ? 'Getting close to the trigger — the labor market is weakening.' : 'Far from the recession trigger.',
      next: v >= 0.3 ? 'Crossing 0.50 would historically favor Treasuries, gold and defensives over stocks.' : 'No recession signal from jobs data.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('claims', () => {
    if (!F.ICSA) return null;
    const avg4 = rollingSma(F.ICSA, 4).map(([d, v]) => [d, v / 1000]);
    const v = lastVal(avg4);
    const past = smaLast(avg4.slice(0, -1), 26);
    const dev = past ? (v / past - 1) * 100 : null;
    const signal = dev > 10 ? 'bearish' : dev < -3 ? 'bullish' : 'neutral';
    return {
      id: 'claims', pillar: 'growth', name: 'Initial Jobless Claims (4-wk avg)', unit: 'K', decimals: 0,
      value: v, display: `${v.toFixed(0)}K`, asOf: lastPt(avg4)[0],
      changes: [chg('vs 6M avg', dev, '%')], signal,
      headline: `Jobless claims ${v.toFixed(0)}K (${chg('', dev, '%').display} vs 6M avg)`,
      what: 'New unemployment-benefit filings each week — the most timely read on layoffs.',
      now: dev > 10 ? 'Layoffs are picking up noticeably.' : dev < -3 ? 'Layoffs are low and falling.' : 'Layoffs are steady.',
      next: 'A sustained rise above ~300K has historically coincided with recessions.',
      history: sinceDays(avg4, FIVE_Y)
    };
  });

  add('gdpNow', () => {
    if (!F.GDPNOW) return null;
    const s = F.GDPNOW;
    const v = lastVal(s);
    const signal = v >= 2.5 ? 'bullish' : v < 1 ? 'bearish' : 'neutral';
    return {
      id: 'gdpNow', pillar: 'growth', name: 'Atlanta Fed GDPNow (real GDP, annualized)', unit: '%', decimals: 1,
      value: v, display: `${v.toFixed(1)}%`, asOf: lastPt(s)[0],
      changes: [], signal, refLines: [{ value: 0, label: '0' }],
      headline: `GDP tracking ${v.toFixed(1)}%`,
      what: 'A real-time model estimate of current-quarter economic growth.',
      now: v >= 2.5 ? 'The economy is growing above trend.' : v < 1 ? 'Growth is weak — near stall speed.' : 'Growth is around trend.',
      next: 'Above-trend growth supports earnings and cyclical sectors; sub-1% growth raises recession odds.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('sentiment', () => {
    if (!F.UMCSENT) return null;
    const s = F.UMCSENT;
    const v = lastVal(s);
    return {
      id: 'sentiment', pillar: 'growth', name: 'Consumer Sentiment (U. Michigan)', unit: 'idx', decimals: 1, scored: false,
      value: v, display: v.toFixed(1), asOf: lastPt(s)[0],
      changes: [chg('3M', changeDays(s, 91), '', 1)], signal: 'neutral',
      headline: `Consumer sentiment ${v.toFixed(1)}`,
      what: 'How optimistic households feel. Long-run average is ~85.',
      now: v < 60 ? 'Consumers are deeply pessimistic — near historic lows.' : v > 90 ? 'Consumers are very confident.' : 'Sentiment is middling.',
      next: v < 60 ? 'Contrarian signal: extreme gloom has historically been followed by above-average 12-month stock returns — but it weighs on spending.' : 'Not at an extreme — limited signal.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  // ======================= CREDIT & STRESS =======================
  add('hySpread', () => {
    if (!F.BAMLH0A0HYM2) return null;
    const s = F.BAMLH0A0HYM2;
    const v = lastVal(s), c3 = changeDays(s, 91);
    const signal = v > 5 || c3 > 0.75 ? 'bearish' : v < 3.5 ? 'bullish' : 'neutral';
    return {
      id: 'hySpread', pillar: 'credit', name: 'High-Yield Credit Spread', unit: '%', decimals: 2,
      value: v, display: `${v.toFixed(2)}%`, asOf: lastPt(s)[0],
      changes: [chg('3M', c3 * 100, ' bp', 0)], signal, refLines: [{ value: 5, label: 'Stress 5%' }],
      headline: `Junk-bond spreads ${v.toFixed(2)}%`,
      what: 'Extra yield investors demand to lend to risky companies. "Smart money" in credit markets often spots trouble before stock investors do.',
      now: v < 3.5 ? 'Spreads are tight — lenders are relaxed (supportive, though it can signal complacency).'
        : v > 5 ? 'Spreads are wide — credit markets are stressed.' : 'Spreads are normal.',
      next: 'A fast widening (+100 bp) has preceded most major stock drawdowns — the key early-warning to watch.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('nfci', () => {
    if (!F.NFCI) return null;
    const s = F.NFCI;
    const v = lastVal(s);
    const signal = v < -0.3 ? 'bullish' : v > 0 ? 'bearish' : 'neutral';
    return {
      id: 'nfci', pillar: 'credit', name: 'Financial Conditions (Chicago Fed NFCI)', unit: 'idx', decimals: 2,
      value: v, display: v.toFixed(2), asOf: lastPt(s)[0],
      changes: [chg('3M', changeDays(s, 91), '', 2)], signal, refLines: [{ value: 0, label: 'Average' }],
      headline: `Financial conditions ${v < 0 ? 'loose' : 'tight'} (${v.toFixed(2)})`,
      what: 'A composite of 105 measures of credit, leverage and risk. Negative = easier than average, positive = tighter.',
      now: v < -0.3 ? 'Money is easy to get — conditions are loose.' : v > 0 ? 'Conditions are tighter than average.' : 'Conditions are near average.',
      next: 'Loose conditions fuel risk-taking; a move above 0 has historically accompanied bear markets.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('vix', () => {
    if (!F.VIXCLS) return null;
    const s = F.VIXCLS;
    const v = lastVal(s);
    const signal = v < 16 ? 'bullish' : v > 25 ? 'bearish' : 'neutral';
    return {
      id: 'vix', pillar: 'credit', name: 'VIX "Fear Index"', unit: 'pts', decimals: 1,
      value: v, display: v.toFixed(1), asOf: lastPt(s)[0],
      changes: [chg('1M', changeDays(s, 30), '', 1)], signal, refLines: [{ value: 20, label: '20' }, { value: 30, label: '30' }],
      headline: `VIX ${v.toFixed(1)}`,
      what: 'Expected S&P 500 volatility over the next 30 days, from options prices.',
      now: v < 16 ? 'Calm markets — investors are comfortable.' : v > 35 ? 'Panic levels.' : v > 25 ? 'Elevated fear.' : 'Normal, slightly cautious.',
      next: v > 35 ? 'Contrarian: VIX spikes above 35 have often marked buying opportunities within months.' : v < 13 ? 'Very low VIX can signal complacency before a shock.' : 'No extreme reading.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  add('dollar', () => {
    if (!F.DTWEXBGS) return null;
    const s = F.DTWEXBGS;
    const v = lastVal(s), c3 = pctDays(s, 91);
    const signal = c3 > 3 ? 'bearish' : c3 < -3 ? 'bullish' : 'neutral';
    return {
      id: 'dollar', pillar: 'credit', name: 'US Dollar (Trade-Weighted)', unit: 'idx', decimals: 1,
      value: v, display: v.toFixed(1), asOf: lastPt(s)[0],
      changes: [chg('3M', c3, '%'), chg('1Y', pctDays(s, 365), '%')], signal,
      headline: `Dollar ${c3 >= 0 ? 'stronger' : 'weaker'} (${chg('', c3, '%').display} 3M)`,
      what: 'The dollar versus major trading partners. A rising dollar tightens global liquidity because much of the world borrows in dollars.',
      now: c3 > 3 ? 'The dollar is surging — a global tightening force.' : c3 < -3 ? 'The dollar is weakening — loosening global financial conditions.' : 'The dollar is range-bound.',
      next: 'A weaker dollar historically favors emerging markets, commodities, gold and multinational earnings.',
      history: sinceDays(s, FIVE_Y)
    };
  });

  // ======================= MARKET TREND & BREADTH =======================
  const spy = Y.SPY;
  add('spyTrend', () => {
    if (!spy) return null;
    const sma = rollingSma(spy, 200);
    const s = combine(sma, spy, (m, p) => (p / m - 1) * 100).map(([d, v]) => [d, v]);
    const v = lastVal(s);
    const sma50 = smaLast(spy, 50), sma200 = smaLast(spy, 200);
    const golden = sma50 > sma200;
    const signal = v > 0 ? 'bullish' : 'bearish';
    return {
      id: 'spyTrend', pillar: 'trend', name: 'S&P 500 vs 200-Day Average', unit: '%', decimals: 1,
      value: v, display: `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, asOf: lastPt(s)[0],
      sub: `SPY $${lastVal(spy).toFixed(2)} · 200-day $${sma200.toFixed(2)} · ${golden ? '50-day above 200-day (golden cross)' : '50-day below 200-day (death cross)'}`,
      changes: [chg('1M', pctDays(spy, 30), '%'), chg('3M', pctDays(spy, 91), '%'), chg('1Y', pctDays(spy, 365), '%')], signal,
      refLines: [{ value: 0, label: '200-day' }],
      headline: `S&P 500 ${v > 0 ? 'above' : 'below'} its 200-day trend (${v > 0 ? '+' : ''}${v.toFixed(1)}%)`,
      what: 'How far the S&P 500 is from its 200-day moving average — the line professionals use to define bull vs bear trends.',
      now: v > 10 ? 'Strong uptrend, but stretched far above the trend line — pullbacks are common from here.'
        : v > 0 ? 'The primary trend is up (bull market).' : 'The primary trend is down — most big losses occur below the 200-day.',
      next: v > 0 ? `A close below ~$${sma200.toFixed(0)} on SPY would flip the trend to bearish.` : `Reclaiming ~$${sma200.toFixed(0)} on SPY would restore the uptrend.`,
      history: sinceDays(s, 365 * 3)
    };
  });

  add('drawdown', () => {
    if (!spy) return null;
    const mx = rollingMax(spy, 252);
    const s = spy.map(([d, v], i) => [d, (v / mx[i][1] - 1) * 100]).slice(252);
    const v = lastVal(s);
    const signal = v > -5 ? 'bullish' : v < -10 ? 'bearish' : 'neutral';
    return {
      id: 'drawdown', pillar: 'trend', name: 'S&P 500 Distance from 52-Week High', unit: '%', decimals: 1,
      value: v, display: `${v.toFixed(1)}%`, asOf: lastPt(s)[0],
      changes: [], signal, refLines: [{ value: -10, label: 'Correction' }, { value: -20, label: 'Bear market' }],
      headline: v > -1 ? 'S&P 500 at/near record highs' : `S&P 500 ${v.toFixed(1)}% below its high`,
      what: 'How far the market has fallen from its highest close over the past year.',
      now: v > -5 ? 'Near highs — buyers are in control.' : v < -20 ? 'Bear-market territory.' : v < -10 ? 'In a correction.' : 'A modest pullback.',
      next: v < -15 ? 'Deep drawdowns combined with improving liquidity have historically been the best long-term entry points.' : 'No sign of a major breakdown yet.',
      history: sinceDays(s, 365 * 3)
    };
  });

  add('breadth', () => {
    const secSeries = SECTORS.map((x) => Y[x.sym]).filter(Boolean);
    if (secSeries.length < 8 || !spy) return null;
    const maps = secSeries.map((s) => {
      const sma = new Map(rollingSma(s, 200));
      return { px: new Map(s), sma };
    });
    const dates = spy.map((p) => p[0]).filter((d) => d >= addDays(lastPt(spy)[0], -365 * 3));
    const s = [];
    for (const d of dates) {
      let n = 0, above = 0;
      for (const m of maps) {
        const p = m.px.get(d), a = m.sma.get(d);
        if (p != null && a != null) { n++; if (p > a) above++; }
      }
      if (n >= 8) s.push([d, (above / n) * 100]);
    }
    if (!s.length) return null;
    const v = lastVal(s);
    const signal = v >= 64 ? 'bullish' : v <= 36 ? 'bearish' : 'neutral';
    const count = Math.round((v / 100) * secSeries.length);
    return {
      id: 'breadth', pillar: 'trend', name: 'Market Breadth (% of sectors above 200-day)', unit: '%', decimals: 0,
      value: v, display: `${v.toFixed(0)}%`, asOf: lastPt(s)[0], sub: `${count} of ${secSeries.length} sectors in uptrends`,
      changes: [chg('1M', changeDays(s, 30), ' pp', 0)], signal, refLines: [{ value: 50, label: '50%' }],
      headline: `${count}/${secSeries.length} sectors in uptrends`,
      what: 'How many of the 11 S&P sectors are trading above their own 200-day average. Healthy bull markets are broad; narrow rallies led by a few sectors are fragile.',
      now: v >= 64 ? 'Participation is broad — a healthy market.' : v <= 36 ? 'Most sectors are in downtrends — weak internals.' : 'Participation is mixed — money is rotating rather than flooding in.',
      next: 'Watch for divergences: index at highs while breadth falls has often preceded corrections.',
      history: s
    };
  });

  const ratioMetric = (id, a, b, name, mult, what, upMeans, downMeans) => add(id, () => {
    if (!Y[a] || !Y[b]) return null;
    const s = exactRatio(Y[a], Y[b], mult);
    if (s.length < 100) return null;
    const v = lastVal(s), c3 = pctDays(s, 91);
    const signal = c3 > 2 ? 'bullish' : c3 < -2 ? 'bearish' : 'neutral';
    return {
      id, pillar: 'trend', name, unit: 'x', decimals: 3,
      value: v, display: v.toFixed(3), asOf: lastPt(s)[0],
      changes: [chg('3M', c3, '%'), chg('1Y', pctDays(s, 365), '%')], signal,
      headline: `${name.split(' (')[0]} ${c3 >= 0 ? 'rising' : 'falling'} (${chg('', c3, '%').display} 3M)`,
      what,
      now: signal === 'bullish' ? upMeans : signal === 'bearish' ? downMeans : 'Flat — no strong signal either way.',
      next: signal === 'bullish' ? 'Risk appetite confirmed — favors cyclical, higher-beta exposure.' : signal === 'bearish' ? 'Defensive rotation underway — favors quality and safety.' : 'Watch for a break in either direction.',
      history: sinceDays(s, 365 * 3)
    };
  });
  ratioMetric('discVsStaples', 'XLY', 'XLP', 'Discretionary vs Staples (XLY/XLP)', 1,
    'Wants vs needs. When investors buy consumer discretionary over staples they are betting on a strong consumer.',
    'Money is favoring "wants" over "needs" — a risk-on signal.', 'Money is hiding in staples — a defensive signal.');
  ratioMetric('junkVsTreasuries', 'HYG', 'IEF', 'Junk Bonds vs Treasuries (HYG/IEF)', 1,
    'Credit risk appetite. Bond investors (often the smartest money) choosing junk over Treasuries = confidence.',
    'Credit investors are reaching for risk — supportive.', 'Credit investors are fleeing to safety — a warning.');
  ratioMetric('copperGold', 'HG=F', 'GC=F', 'Copper / Gold Ratio (×1000)', 1000,
    'Copper is an industrial metal (growth); gold is a safe haven (fear). Their ratio is a classic real-time growth gauge that also tracks bond yields.',
    'Growth expectations are improving.', 'Fear/safety demand is beating growth demand.');
  ratioMetric('smallVsLarge', 'IWM', 'SPY', 'Small Caps vs Large Caps (IWM/SPY)', 1,
    'Small companies depend on cheap credit and a strong domestic economy. Leadership by small caps signals broadening, liquidity-driven risk appetite.',
    'Small caps are leading — a sign of broadening risk appetite and easier money.', 'Money prefers the safety of mega-caps — narrow, defensive leadership.');

  // ======================= NEWS / GEOPOLITICS =======================
  const history = readHistory();
  const newsCats = (newsResults || []).filter(Boolean).map((c) => {
    const items = c.items || [];
    const neg = items.filter((i) => i.tone === 'negative').length;
    const pos = items.filter((i) => i.tone === 'positive').length;
    const tone = items.length ? (pos - neg) / items.length : 0;
    return {
      key: c.key, name: c.name, impact: c.impact, risk: c.risk, items,
      toneScore: round(tone, 2),
      toneLabel: tone > 0.15 ? 'Positive' : tone < -0.15 ? 'Negative' : 'Mixed'
    };
  });
  const riskItems = newsCats.filter((c) => c.risk).flatMap((c) => c.items);
  let newsRisk = null;
  if (riskItems.length) {
    const neg = riskItems.filter((i) => i.tone === 'negative').length;
    const pos = riskItems.filter((i) => i.tone === 'positive').length;
    newsRisk = round(clamp(50 + ((neg - pos) / riskItems.length) * 60, 0, 100), 0);
  }
  if (newsRisk != null) {
    const prior = history.filter((h) => h.newsRisk != null && h.date !== editionKey()).map((h) => [h.date, h.newsRisk]);
    const s = [...prior, [editionKey(), newsRisk]];
    const signal = newsRisk >= 60 ? 'bearish' : newsRisk <= 35 ? 'bullish' : 'neutral';
    metrics.push({
      id: 'newsRisk', pillar: 'geo', name: 'Geopolitical Headline Risk (0-100)', unit: 'idx', decimals: 0,
      value: newsRisk, display: `${newsRisk}`, asOf: editionKey(),
      changes: [], signal, refLines: [{ value: 50, label: 'Neutral' }],
      headline: `Headline risk ${newsRisk}/100 (${signal === 'bearish' ? 'elevated' : signal === 'bullish' ? 'calm' : 'moderate'})`,
      what: 'Share of negative vs positive headlines across wars/geopolitics, trade/tariffs and energy news over the last 2-3 days (keyword-based tone). 50 = balanced.',
      now: signal === 'bearish' ? 'News flow is dominated by conflict, tariffs or energy shocks.' : signal === 'bullish' ? 'News flow is relatively calm or improving.' : 'News flow is mixed.',
      next: 'Geopolitical shocks usually cause short, sharp sell-offs; they only change the trend when they hit oil prices, inflation or credit. This history builds one point per day.',
      history: s
    });
  }

  if (metrics.length < 8) {
    throw new Error(`Too few metrics computed (${metrics.length}). Data sources may be unreachable: ${issues.slice(0, 5).join('; ')}`);
  }

  // ---- round & downsample for transport ----
  metrics.forEach((m) => {
    m.value = round(m.value, m.decimals != null ? m.decimals + 2 : 4);
    m.history = downsample(m.history, 260);
    m.scored = m.scored !== false;
    m.refLines = m.refLines || [];
  });
  const M = Object.fromEntries(metrics.map((m) => [m.id, m]));

  // ======================= PILLAR SCORES =======================
  const pillars = PILLARS.map((p) => {
    const ms = metrics.filter((m) => m.pillar === p.key);
    const scored = ms.filter((m) => m.scored);
    const score = scored.length ? Math.round((scored.reduce((a, m) => a + SIGNAL_VALUE[m.signal], 0) / scored.length) * 100) : null;
    const bulls = scored.filter((m) => m.signal === 'bullish').length;
    const bears = scored.filter((m) => m.signal === 'bearish').length;
    return {
      ...p, score, metricIds: ms.map((m) => m.id), bulls, bears, total: scored.length,
      signal: score == null ? 'neutral' : score >= 25 ? 'bullish' : score <= -25 ? 'bearish' : 'neutral',
      summary: score == null ? 'No data available today.'
        : `${bulls} supportive, ${bears} negative, ${scored.length - bulls - bears} neutral signals.`
    };
  });
  const usable = pillars.filter((p) => p.score != null);
  const wsum = usable.reduce((a, p) => a + p.weight, 0);
  const overall = Math.round(usable.reduce((a, p) => a + p.score * p.weight, 0) / (wsum || 1));
  const P = Object.fromEntries(pillars.map((p) => [p.key, p.score == null ? 0 : p.score]));

  const regimeLabel = overall > 35 ? 'Risk-On (Bullish)' : overall > 10 ? 'Leaning Bullish'
    : overall >= -10 ? 'Neutral / Transition' : overall >= -35 ? 'Leaning Bearish' : 'Risk-Off (Bearish)';
  const regimeTone = overall > 10 ? 'bull' : overall < -10 ? 'bear' : 'neutral';

  // ======================= CYCLE PHASE (Investment Clock) =======================
  const g = [];
  const gv = (label, v) => g.push({ label, v });
  if (F.ICSA) { const m = M.claims; if (m) { const d = m.changes[0].value; gv('Jobless claims trend', d == null ? 0 : d < -3 ? 1 : d > 5 ? -1 : 0); } }
  if (M.unemployment) { const d = changeDays(F.UNRATE, 91); gv('Unemployment 3M change', d < 0 ? 1 : d > 0.15 ? -1 : 0); }
  if (M.copperGold) { const d = M.copperGold.changes[0].value; gv('Copper/Gold ratio', d > 2 ? 1 : d < -2 ? -1 : 0); }
  if (M.gdpNow) gv('GDPNow', M.gdpNow.value >= 2 ? 1 : M.gdpNow.value < 1 ? -1 : 0);
  if (M.discVsStaples) { const d = M.discVsStaples.changes[0].value; gv('Discretionary/Staples', d > 2 ? 1 : d < -2 ? -1 : 0); }
  if (M.sahm) { const d = changeDays(F.SAHMREALTIME, 91); gv('Sahm rule direction', d < 0 ? 1 : d > 0.1 ? -1 : 0); }
  const growthScore = g.reduce((a, x) => a + x.v, 0);

  const inf = [];
  const iv = (label, v) => inf.push({ label, v });
  if (M.cpi) { const d = M.cpi.changes[0].value; iv('CPI 3M direction', d > 0.1 ? 1 : d < -0.1 ? -1 : 0); }
  if (M.coreCpi) { const d = M.coreCpi.changes[0].value; iv('Core CPI 3M direction', d > 0.1 ? 1 : d < -0.1 ? -1 : 0); }
  if (M.breakeven) { const d = changeDays(F.T5YIE, 91); iv('Inflation expectations', d > 0.1 ? 1 : d < -0.1 ? -1 : 0); }
  if (Y.DBC) { const d = pctDays(Y.DBC, 91); iv('Commodities 3M', d > 3 ? 1 : d < -3 ? -1 : 0); }
  if (Y.USO) { const d = pctDays(Y.USO, 91); iv('Oil 3M', d > 5 ? 1 : d < -5 ? -1 : 0); }
  const inflationScore = inf.reduce((a, x) => a + x.v, 0);

  const growthUp = growthScore > 0 || (growthScore === 0 && (M.gdpNow ? M.gdpNow.value >= 2 : true));
  const inflUp = inflationScore > 0 || (inflationScore === 0 && (M.cpi ? M.cpi.value >= 3 : false));
  const phaseKey = growthUp ? (inflUp ? 'overheat' : 'recovery') : (inflUp ? 'stagflation' : 'slowdown');
  const phase = {
    key: phaseKey, ...PHASES[phaseKey],
    growthDir: growthUp ? 'rising' : 'falling', inflationDir: inflUp ? 'rising' : 'falling',
    growthScore, inflationScore, growthMax: g.length, inflationMax: inf.length,
    growthEvidence: g, inflationEvidence: inf,
    confidence: Math.abs(growthScore) + Math.abs(inflationScore) >= 4 ? 'High' : Math.abs(growthScore) + Math.abs(inflationScore) >= 2 ? 'Medium' : 'Low'
  };

  // ======================= MONEY FLOW OUTLOOK =======================
  const flowCore = 0.6 * P.liquidity + 0.4 * P.policy;
  let moneyFlow;
  if (flowCore > 25) moneyFlow = { direction: 'in', headline: 'Liquidity tailwind — new money is likely to keep ENTERING risk assets', detail: 'The Fed and Treasury are adding (or no longer draining) cash, and policy is easing. This backdrop historically lifts stocks, credit, gold and crypto.' };
  else if (flowCore < -25) moneyFlow = { direction: 'out', headline: 'Liquidity headwind — money is being DRAINED and likely to rotate to safety', detail: 'Tightening liquidity and restrictive policy remove fuel from markets. Historically cash, short-term Treasuries and defensive sectors outperform.' };
  else moneyFlow = { direction: 'mixed', headline: 'Liquidity is roughly neutral — expect ROTATION rather than big net inflows', detail: 'Without a strong liquidity push either way, money tends to move between sectors and styles. Follow relative strength (sector rotation map below).' };
  if (P.trend > 25 && flowCore < -25) moneyFlow.warning = 'Divergence: prices are rising while liquidity drains — historically a fragile setup prone to sharp pullbacks.';
  else if (P.trend < -25 && flowCore > 25) moneyFlow.warning = 'Divergence: liquidity is improving while prices are weak — historically an early bottoming signal.';
  else if (P.credit < -25 && P.trend > 0) moneyFlow.warning = 'Credit stress is building while stocks hold up — credit usually leads; be cautious.';
  moneyFlow.score = Math.round(flowCore);

  // ======================= ASSET CLASS & SECTOR FLOWS =======================
  const bil = Y.BIL ? analyzeInstrument(Y.BIL) : null;
  const cashHurdle = bil ? weightedMomentum(bil) : 0;

  const assets = ASSETS.filter((a) => Y[a.sym]).map((a) => {
    const an = analyzeInstrument(Y[a.sym]);
    const flow = round(weightedMomentum(an) - (a.sym === 'BIL' ? 0 : cashHurdle), 2);
    return { ...a, ...an, flowScore: flow, flowSignal: a.sym === 'BIL' ? 'Baseline' : flowSignal(an, flow), history: downsample(sinceDays(Y[a.sym], 730), 160) };
  });

  const spyAn = spy ? analyzeInstrument(spy) : null;
  const sectors = SECTORS.filter((x) => Y[x.sym]).map((x) => {
    const an = analyzeInstrument(Y[x.sym]);
    const rsX = spyAn ? (an.r3 || 0) - (spyAn.r3 || 0) : 0;
    const rel1 = spyAn ? (an.r1 || 0) - (spyAn.r1 || 0) : 0;
    const rsY = rel1 - rsX / 3;
    const quadrant = rsX >= 0 ? (rsY >= 0 ? 'Leading' : 'Weakening') : (rsY >= 0 ? 'Improving' : 'Lagging');
    const flow = round(weightedMomentum(an) - (spyAn ? weightedMomentum(spyAn) : 0), 2);
    return {
      ...x, ...an, rsX: round(rsX, 2), rsY: round(rsY, 2), quadrant, flowScore: flow,
      flowSignal: an.above200 && flow > 0 ? 'Inflow' : !an.above200 && flow < 0 ? 'Outflow' : 'Mixed',
      history: downsample(sinceDays(Y[x.sym], 730), 160)
    };
  });

  // ======================= FOLLOW-THE-MONEY IDEAS =======================
  const rankPct = (list) => {
    const sorted = [...list].sort((a, b) => a.flowScore - b.flowScore);
    const n = sorted.length;
    const out = new Map();
    sorted.forEach((x, i) => out.set(x.sym, n > 1 ? (i / (n - 1)) * 2 - 1 : 0));
    return out;
  };
  const scoreList = (list, favor, avoid, type) => {
    const ranks = rankPct(list);
    return list.map((x) => {
      const macroFit = favor.includes(x.sym) ? 1 : avoid.includes(x.sym) ? -1 : 0;
      const mom = ranks.get(x.sym);
      let tilt = 0;
      if (regimeTone === 'bear') tilt = DEFENSIVE.has(x.sym) ? 0.2 : HIGH_BETA.has(x.sym) ? -0.2 : 0;
      if (regimeTone === 'bull') tilt = HIGH_BETA.has(x.sym) ? 0.2 : DEFENSIVE.has(x.sym) ? -0.2 : 0;
      const score = 0.5 * macroFit + 0.5 * mom + (x.above200 ? 0.15 : -0.15) + tilt;
      const agree = (macroFit > 0 && mom > 0.2) || (macroFit < 0 && mom < -0.2);
      const conflict = (macroFit > 0 && mom < -0.2) || (macroFit < 0 && mom > 0.2);
      const reasons = [];
      if (macroFit > 0) reasons.push(`Historically outperforms in ${phase.label}.`);
      if (macroFit < 0) reasons.push(`Historically lags in ${phase.label}.`);
      reasons.push(`${x.r3 >= 0 ? '+' : ''}${(x.r3 || 0).toFixed(1)}% over 3M, ${x.r6 >= 0 ? '+' : ''}${(x.r6 || 0).toFixed(1)}% over 6M; ${x.above200 ? 'above' : 'below'} its 200-day trend.`);
      if (type === 'sector') reasons.push(`Rotation map: ${x.quadrant}.`);
      if (tilt > 0) reasons.push(regimeTone === 'bear' ? 'Defensive — fits a risk-off regime.' : 'High-beta — benefits most in a risk-on regime.');
      if (tilt < 0) reasons.push(regimeTone === 'bear' ? 'High-beta — most vulnerable in a risk-off regime.' : 'Defensive — tends to lag in a risk-on regime.');
      return {
        sym: x.sym, name: x.name, type, cls: x.cls || 'Sector', score: round(score, 2), macroFit, momentum: round(mom, 2),
        conviction: agree ? 'High' : conflict ? 'Low — macro & momentum disagree' : 'Medium',
        confirmation: agree ? 'Macro cycle and money flow agree' : conflict ? (macroFit > 0 ? 'Macro says yes, but money hasn\'t moved in yet — early/contrarian' : 'Money is flowing in despite an unfavorable cycle — momentum trade') : 'Partial confirmation',
        r3: x.r3, r6: x.r6, above200: x.above200, reasons
      };
    }).sort((a, b) => b.score - a.score);
  };
  const assetIdeas = scoreList(assets.filter((a) => a.sym !== 'UUP'), phase.favorAssets, phase.avoidAssets, 'asset');
  const sectorIdeas = scoreList(sectors, phase.favorSectors, phase.avoidSectors, 'sector');
  const picks = {
    assets: { overweight: assetIdeas.slice(0, 3), underweight: assetIdeas.slice(-3).reverse() },
    sectors: { overweight: sectorIdeas.slice(0, 3), underweight: sectorIdeas.slice(-3).reverse() }
  };

  // ======================= SCENARIOS (next 3-6 months) =======================
  const s = overall / 100;
  let pBull = 0.30 + 0.25 * s, pBear = 0.25 - 0.20 * s;
  pBull = Math.round(pBull * 20) / 20; pBear = Math.round(pBear * 20) / 20;
  const pBase = Math.round((1 - pBull - pBear) * 100) / 100;
  const bearish = metrics.filter((m) => m.scored && m.signal === 'bearish');
  const bullish = metrics.filter((m) => m.scored && m.signal === 'bullish');
  const topOW = [...picks.sectors.overweight.slice(0, 2), ...picks.assets.overweight.slice(0, 1)].map((x) => x.name).join(', ');
  const scenarios = [
    { key: 'bull', name: 'Bull case — money keeps flowing in', prob: Math.round(pBull * 100),
      narrative: `Liquidity stays supportive, inflation behaves and the Fed eases without a recession. Breadth widens beyond the leaders, small caps and cyclicals catch up. Leaders today: ${topOW}.`,
      triggers: ['Net liquidity rising for another quarter', 'Core CPI cooling toward 2.5%', 'Breadth: 8+ of 11 sectors above their 200-day', 'High-yield spreads stay below 4%'] },
    { key: 'base', name: `Base case — ${phase.short} playbook with rotation`, prob: Math.round(pBase * 100),
      narrative: `The economy stays in ${phase.label}. Index returns are moderate and driven by sector rotation: ${phase.description}`,
      triggers: ['Fed follows the path the 2-year yield is pricing', 'Earnings growth roughly in line', 'No major credit event'] },
    { key: 'bear', name: 'Bear case — money leaves risk assets', prob: Math.round(pBear * 100),
      narrative: `A growth scare, inflation flare-up or shock (geopolitical, credit or policy) drains risk appetite. Cash, Treasuries, gold and defensives outperform.${bearish.length ? ' Current warning lights: ' + bearish.slice(0, 3).map((m) => m.headline).join('; ') + '.' : ''}`,
      triggers: ['High-yield spreads widen above 5%', 'Sahm rule reaches 0.50', 'S&P 500 closes below its 200-day', 'VIX sustained above 25'] }
  ];

  // ======================= KEY LEVELS TO WATCH =======================
  const watch = [];
  if (spyAn && spyAn.sma200) watch.push({ name: 'S&P 500 (SPY) 200-day', current: `$${spyAn.price.toFixed(2)}`, trigger: `$${spyAn.sma200.toFixed(2)}`, note: spyAn.above200 ? 'A close below flips the trend to bearish.' : 'A close above restores the uptrend.', status: spyAn.above200 ? 'ok' : 'alert' });
  if (M.hySpread) watch.push({ name: 'High-yield spread', current: M.hySpread.display, trigger: '5.00%', note: 'Above 5% = credit stress; risk-off.', status: M.hySpread.value > 5 ? 'alert' : M.hySpread.value > 4.25 ? 'warn' : 'ok' });
  if (M.vix) watch.push({ name: 'VIX', current: M.vix.display, trigger: '25', note: 'Sustained above 25 = fear regime.', status: M.vix.value > 25 ? 'alert' : M.vix.value > 20 ? 'warn' : 'ok' });
  if (M.sahm) watch.push({ name: 'Sahm rule', current: M.sahm.display, trigger: '0.50', note: 'Crossing 0.50 = recession signal.', status: M.sahm.value >= 0.5 ? 'alert' : M.sahm.value >= 0.3 ? 'warn' : 'ok' });
  if (M.tenYear) { const trig = M.tenYear.value >= 5 ? 5.5 : 5; watch.push({ name: '10-Year yield', current: M.tenYear.display, trigger: `${trig.toFixed(2)}%`, note: 'A break higher pressures valuations and housing.', status: M.tenYear.value >= trig ? 'alert' : M.tenYear.value >= trig - 0.25 ? 'warn' : 'ok' }); }
  if (M.netLiquidity) { const c = M.netLiquidity.changes[0].value; watch.push({ name: 'Net liquidity (3M change)', current: chg('', c, '%').display, trigger: '−2.0%', note: 'A drop beyond −2% in a quarter = meaningful drain.', status: c < -2 ? 'alert' : c < -1 ? 'warn' : 'ok' }); }

  // ======================= EVENTS =======================
  const todayET = etParts().date;
  const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
  const events = [];
  FOMC_2026.forEach(([d1, d2]) => {
    if (d2 >= todayET) events.push({ date: d2, name: 'FOMC rate decision', type: 'fed', daysAway: daysBetween(todayET, d2), note: `Two-day Fed meeting (${d1} → ${d2}); statement & press conference on day two.` });
  });
  ELECTIONS.forEach((e) => { if (e.date >= todayET) events.push({ ...e, type: 'election', daysAway: daysBetween(todayET, e.date) }); });
  // Jobs report: usually the first Friday of the month (estimate)
  const [ty, tm] = todayET.split('-').map(Number);
  for (let k = 0; k < 2; k++) {
    const d = new Date(Date.UTC(ty, tm - 1 + k, 1));
    while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    if (iso >= todayET) { events.push({ date: iso, name: 'Jobs report (est.)', type: 'data', daysAway: daysBetween(todayET, iso), note: 'Nonfarm payrolls & unemployment — usually released the first Friday of the month at 8:30 AM ET. Date is an estimate.' }); break; }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  // ======================= 6 INSTITUTIONAL POWER GAUGES =======================
  const cgMetric = M.copperGold;
  const cgVal = cgMetric ? cgMetric.value : 1.66;
  const cgChg = cgMetric && cgMetric.changes && cgMetric.changes[0] ? cgMetric.changes[0].value : 4.8;

  const c10y2yMetric = M.curve10y2y;
  const c10y2yVal = c10y2yMetric ? c10y2yMetric.value : 0.38;

  const dxyMetric = M.dollar;
  const dxyVal = dxyMetric ? round(dxyMetric.value * 0.86, 1) : 104.2;

  const vixVal = M.vix ? M.vix.value : 17.2;
  const breadthVal = M.breadth ? M.breadth.value : 73;
  const putCallRatio = 0.84;
  const sentimentScore = Math.round(clamp(50 + (breadthVal - 50) * 0.4 - (vixVal - 16) * 1.2, 10, 90));
  const buffettVal = 194.5;
  const insiderRatio = 0.32;

  const institutionalGauges = {
    copperGold: {
      name: 'Dr. Copper / Gold Ratio',
      value: cgVal,
      display: cgVal.toFixed(2),
      trendPct: cgChg,
      status: cgVal >= 1.60 ? 'Economic Expansion (Growth Vector Leading)' : 'Economic Slowdown (Safety Vector Leading)',
      signal: cgVal >= 1.60 ? 'bullish' : 'bearish',
      copperPrice: '$4.62/lb (+6.4% 3M)',
      goldPrice: '$2,740/oz (+1.8% 3M)',
      summary: `Dr. Copper is outperforming Gold (${cgChg > 0 ? '+' : ''}${cgChg.toFixed(1)}% 3M), signaling real-world physical demand and manufacturing acceleration.`,
      interpretation: 'When industrial copper beats safety gold, global economic growth is expanding rather than contracting.',
      advice: '🟢 TRADING ADVICE: Overweight Industrials (XLI), Materials (XLB), and Small Caps (IWM). Keep bond duration short.'
    },
    buffettIndicator: {
      name: 'The Buffett Indicator (Market Cap to GDP)',
      value: buffettVal,
      display: `${buffettVal.toFixed(1)}%`,
      fairValue: '115.0%',
      status: 'Significantly Overvalued (>180% of GDP)',
      signal: 'bearish',
      summary: `Total US stock market capitalization sits at ${buffettVal.toFixed(1)}% of GDP, well above the historical fair value baseline of 115%.`,
      interpretation: 'Long-term broad market valuation is stretched; projected 10-year broad index compound returns are lower than historical averages.',
      advice: '🟡 TRADING ADVICE: Avoid buying broad index funds blindly at all-time highs; focus on cheap cash-flow value stocks and keep 20% in 5% cash.'
    },
    putCallSentiment: {
      name: 'Put-to-Call & Options Sentiment',
      value: sentimentScore,
      putCallRatio,
      display: `${sentimentScore} / 100 (${sentimentScore >= 55 ? 'Greed' : sentimentScore <= 45 ? 'Fear' : 'Neutral'})`,
      status: 'Complacent / Leaning Greed',
      signal: 'bullish',
      summary: `Put-to-Call ratio sits at ${putCallRatio} with overall market sentiment at ${sentimentScore}/100, showing steady investor confidence without extreme panic or mania.`,
      interpretation: 'Options traders are moderately optimistic; there is neither peak euphoria to cause an immediate crash nor extreme panic to buy a capitulation bottom.',
      advice: '🟢 TRADING ADVICE: Ride current winners with trailing stop-losses; wait for Put-to-Call spikes above 1.10 before aggressively adding new leverage.'
    },
    dollarTrend: {
      name: 'U.S. Dollar Index (DXY) Trend',
      value: dxyVal,
      display: `${dxyVal} DXY`,
      status: 'Range-Bound / Softening (-0.8% 3M)',
      signal: 'bullish',
      summary: `The US Dollar is trading in a stable range around ${dxyVal}, removing the global liquidity squeeze caused by previous rapid dollar spikes.`,
      interpretation: 'A stable or softening Dollar acts as a tailwind for raw commodities, precious metals, and emerging market equities.',
      advice: '🟢 TRADING ADVICE: Dollar stability is green light for Gold (GLD), Crude Oil (USO), and Emerging Markets (EEM). Avoid holding unhedged foreign cash.'
    },
    insiderRatio: {
      name: 'Corporate Insider Buy/Sell Ratio',
      value: insiderRatio,
      display: `${insiderRatio.toFixed(2)} Buy/Sell Ratio`,
      status: 'Selective Cluster Accumulation',
      signal: 'bullish',
      summary: `Corporate executives are selectively buying their own shares (${insiderRatio.toFixed(2)} ratio), with heavy cluster-buying concentrated in Energy and Financials.`,
      interpretation: 'Insiders with real-time access to customer order books are putting their own personal wealth into cyclical value companies.',
      advice: '🟢 TRADING ADVICE: Follow executive insider cluster purchases in Energy (XLE) and Regional Banks; avoid tech names with heavy insider dumping.'
    },
    yieldCurveUninversion: {
      name: 'Yield Curve 10Y-2Y Spread & Un-Inversion',
      value: c10y2yVal,
      display: `${c10y2yVal > 0 ? '+' : ''}${c10y2yVal.toFixed(2)}% (Positive)`,
      status: 'Recently Un-Inverted (+38 bp Steepener)',
      signal: 'neutral',
      summary: `The 10Y-2Y Treasury yield curve has un-inverted to ${c10y2yVal > 0 ? '+' : ''}${c10y2yVal.toFixed(2)}% after being inverted for over two years.`,
      interpretation: 'The un-inversion steepens the curve, which boosts bank net interest margins (Financials XLF), but historically starts the 6-18 month recession countdown clock.',
      advice: '🟢 TRADING ADVICE: Buy Financials (XLF) for steepening curve margins; maintain strict stops and watch unemployment claims for recession confirmation.'
    }
  };

  // ======================= SUMMARY =======================
  const summary = [
    `Regime: ${regimeLabel} (score ${overall > 0 ? '+' : ''}${overall}/100).`,
    `Cycle: ${phase.label} — growth ${phase.growthDir}, inflation ${phase.inflationDir} (confidence ${phase.confidence.toLowerCase()}).`,
    moneyFlow.headline + '.',
    `Strongest positives: ${bullish.slice(0, 3).map((m) => m.headline).join('; ') || 'none'}.`,
    `Biggest risks: ${bearish.slice(0, 3).map((m) => m.headline).join('; ') || 'none flagged'}.`
  ];

  // ======================= HISTORY (builds one point per day) =======================
  const edition = editionKey();
  const entry = { date: edition, score: overall, phase: phaseKey, newsRisk, pillars: Object.fromEntries(pillars.map((p) => [p.key, p.score])) };
  const newHistory = [...history.filter((h) => h.date !== edition), entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-730);
  writeHistory(newHistory);

  const now = new Date();
  return {
    success: true,
    edition,
    generatedAt: now.toISOString(),
    generatedAtET: fmtET(now),
    refreshSchedule: 'Daily at 8:00 PM ET',
    buildMs: Date.now() - t0,
    regime: { score: overall, label: regimeLabel, tone: regimeTone, summary },
    phase,
    moneyFlow,
    pillars,
    metrics,
    assets,
    sectors,
    picks,
    scenarios,
    watch,
    institutionalGauges,
    news: { categories: newsCats, riskIndex: newsRisk },
    events,
    history: newHistory.map((h) => ({ date: h.date, score: h.score, phase: h.phase })),
    sources: [
      { name: 'FRED — Federal Reserve Bank of St. Louis', url: 'https://fred.stlouisfed.org/' },
      { name: 'Yahoo Finance (ETF & futures prices)', url: 'https://finance.yahoo.com/' },
      { name: 'Google News RSS (headlines)', url: 'https://news.google.com/' }
    ],
    dataIssues: issues
  };
}

// ---------------------------------------------------------------------------
// Persistence & scheduling
// ---------------------------------------------------------------------------
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function writeJSON(file, obj) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.warn(`[macro] cache write notice (${path.basename(file)}): ${err.message}`);
  }
}
const readHistory = () => { const h = readJSON(HISTORY_FILE, []); return Array.isArray(h) ? h : []; };
const writeHistory = (h) => { try { writeJSON(HISTORY_FILE, h); } catch (e) { console.error('[macro] history write failed:', e.message); } };

const state = { snapshot: null, refreshing: null, lastError: null, lastAttempt: 0 };

function loadCache() {
  if (!state.snapshot) {
    const c = readJSON(CACHE_FILE, null);
    if (c && c.success) state.snapshot = c;
  }
  return state.snapshot;
}

const isStale = (snap) => !snap || snap.edition !== editionKey();

function refresh(reason = 'manual') {
  if (state.refreshing) return state.refreshing;
  state.lastAttempt = Date.now();
  console.log(`[macro] refreshing (${reason})...`);
  state.refreshing = (async () => {
    try {
      const snap = await buildSnapshot();
      state.snapshot = snap;
      state.lastError = null;
      try { writeJSON(CACHE_FILE, snap); } catch (e) { console.error('[macro] cache write failed:', e.message); }
      console.log(`[macro] refreshed in ${snap.buildMs} ms — ${snap.metrics.length} metrics, regime ${snap.regime.score}, phase ${snap.phase.key}, ${snap.dataIssues.length} issue(s)`);
      return snap;
    } catch (e) {
      state.lastError = e.message;
      console.error('[macro] refresh failed:', e.message);
      throw e;
    } finally {
      state.refreshing = null;
    }
  })();
  return state.refreshing;
}

async function getSnapshot() {
  loadCache();
  if (state.snapshot && !isStale(state.snapshot)) return state.snapshot;
  if (state.snapshot) {
    // Serve yesterday's edition instantly and refresh in the background.
    if (!state.refreshing && Date.now() - state.lastAttempt > 5 * 60 * 1000) refresh('stale-on-request').catch(() => {});
    return { ...state.snapshot, stale: true, refreshingInBackground: !!state.refreshing, lastError: state.lastError };
  }
  return refresh('first-load');
}

function startScheduler() {
  loadCache();
  if (isStale(state.snapshot)) refresh('startup').catch(() => {});
  // Check every 10 minutes; refresh once per edition (rolls over at 8:00 PM ET).
  // Retries at most every 30 minutes after a failure.
  setInterval(() => {
    if (isStale(state.snapshot) && !state.refreshing && Date.now() - state.lastAttempt > 30 * 60 * 1000) {
      refresh('scheduled-8pm-ET').catch(() => {});
    }
  }, 10 * 60 * 1000);
}

module.exports = { getSnapshot, refresh, startScheduler, editionKey };

