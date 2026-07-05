// Tradovate integration: authenticate, pull fills for a day, pair them into
// round-trip trades, and hand them to the journal store.
const fs = require('fs');
const path = require('path');
const store = require('./store');

const SETTINGS_FILE = path.join(__dirname, 'data', 'tradovate.json');

const HOSTS = {
  demo: 'https://demo.tradovateapi.com/v1',
  live: 'https://live.tradovateapi.com/v1',
};

const MONTH_CODES = 'FGHJKMNQUVXZ';

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); }
  catch { return { env: 'demo', appId: 'TradezillaJournal', appVersion: '1.0', name: '', password: '', cid: '', sec: '', deviceId: 'tradezilla-nas' }; }
}

function saveSettings(s) {
  const cur = loadSettings();
  const next = { ...cur, ...s };
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  const tmp = SETTINGS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, SETTINGS_FILE);
  try { fs.chmodSync(SETTINGS_FILE, 0o600); } catch {}
  return next;
}

// Never send secrets back to the browser.
function publicSettings() {
  const s = loadSettings();
  return {
    env: s.env, appId: s.appId, name: s.name, deviceId: s.deviceId,
    hasPassword: !!s.password, hasApiKey: !!(s.cid && s.sec),
  };
}

function baseUrl(env) { return HOSTS[env === 'live' ? 'live' : 'demo']; }

async function getAccessToken(s) {
  const body = {
    name: s.name, password: s.password,
    appId: s.appId || 'TradezillaJournal', appVersion: s.appVersion || '1.0',
    cid: s.cid, sec: s.sec, deviceId: s.deviceId || 'tradezilla-nas',
  };
  const res = await fetch(baseUrl(s.env) + '/auth/accessTokenRequest', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (data['p-ticket']) {
    throw new Error('Tradovate rate-limit / captcha penalty active. Try again in ' + (data['p-time'] || '?') + 's.');
  }
  if (!data.accessToken) {
    throw new Error(data.errorText || ('Authentication failed (HTTP ' + res.status + ')'));
  }
  return data.accessToken;
}

async function apiGet(env, token, pathname) {
  const res = await fetch(baseUrl(env) + pathname, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('GET ' + pathname + ' failed (HTTP ' + res.status + ')');
  return res.json();
}

async function resolveContractName(env, token, id, cache) {
  if (cache.has(id)) return cache.get(id);
  let name = String(id);
  try {
    const c = await apiGet(env, token, '/contract/item?id=' + id);
    if (c && c.name) name = c.name;
  } catch {}
  cache.set(id, name);
  return name;
}

// Derive the product root (NQ, ES, MNQ, ...) from a contract name like "NQM5".
function symbolRoot(name) {
  const m = /^([A-Z0-9]+?)([FGHJKMNQUVXZ])(\d{1,2})$/.exec(String(name).toUpperCase());
  return m ? m[1] : String(name).toUpperCase();
}

// FIFO-pair fills of a single contract into complete round-trip cycles.
// fills: [{ id, action:'Buy'|'Sell', qty, price, timestamp }] sorted ascending by time.
function pairContractFills(fills) {
  const trades = [];
  let open = []; // queue of units: { dir:+1|-1, price, time, fillId }
  let cycle = null; // { dir, entry:[{price,time,fillId}], exit:[{price,time,fillId}] }

  const startCycle = (dir) => { cycle = { dir, entry: [], exit: [] }; };
  const emit = () => {
    if (!cycle || !cycle.exit.length) { cycle = null; return; }
    const qty = cycle.exit.length;
    const avg = (a) => a.reduce((s, u) => s + u.price, 0) / a.length;
    const entryPrice = avg(cycle.entry);
    const exitPrice = avg(cycle.exit);
    const entryTime = cycle.entry[0].time;
    const exitTime = cycle.exit[cycle.exit.length - 1].time;
    const entryIds = cycle.entry.map((u) => u.fillId);
    const exitIds = cycle.exit.map((u) => u.fillId);
    trades.push({
      dir: cycle.dir, qty, entryPrice, exitPrice, entryTime, exitTime,
      entryIds, exitIds,
    });
    cycle = null;
  };

  for (const f of fills) {
    const dir = f.action === 'Sell' ? -1 : 1;
    let units = Math.abs(Number(f.qty) || 0);
    while (units > 0) {
      if (open.length && open[0].dir === -dir) {
        // closing a unit
        const entryUnit = open.shift();
        if (!cycle) startCycle(entryUnit.dir);
        cycle.entry.push(entryUnit);
        cycle.exit.push({ price: Number(f.price), time: f.timestamp, fillId: f.id });
        units -= 1;
        if (open.length === 0) emit(); // back to flat -> complete round trip
      } else {
        // opening / extending
        if (!cycle && open.length === 0) startCycle(dir);
        open.push({ dir, price: Number(f.price), time: f.timestamp, fillId: f.id });
        units -= 1;
      }
    }
  }
  return { trades, openUnits: open.length };
}

function localDateParts(iso) {
  // Uses the container's local time. Returns { date:'YYYY-MM-DD', time:'HH:MM' }.
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
    time: pad(d.getHours()) + ':' + pad(d.getMinutes()),
  };
}

// Main sync. date = 'YYYY-MM-DD' (local) to import, or null for today.
async function sync(date) {
  const s = loadSettings();
  if (!s.name || !s.password) throw new Error('Tradovate username/password not set. Open Settings first.');
  if (!s.cid || !s.sec) throw new Error('Tradovate API key (cid/sec) not set. Open Settings first.');

  const targetDate = date || localDateParts(new Date().toISOString()).date;
  const token = await getAccessToken(s);

  const allFills = await apiGet(s.env, token, '/fill/list');
  if (!Array.isArray(allFills)) throw new Error('Unexpected /fill/list response.');

  // keep only fills that fall on the target local date
  const dayFills = allFills.filter((f) => f && f.timestamp && localDateParts(f.timestamp).date === targetDate);

  // group by contract
  const cache = new Map();
  const byContract = {};
  for (const f of dayFills) (byContract[f.contractId] = byContract[f.contractId] || []).push(f);

  let created = 0, skipped = 0, openLeft = 0;
  const results = [];

  for (const [contractId, fills] of Object.entries(byContract)) {
    fills.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const name = await resolveContractName(s.env, token, contractId, cache);
    const root = symbolRoot(name);
    const { trades, openUnits } = pairContractFills(fills);
    openLeft += openUnits;

    for (const t of trades) {
      const sourceId = 'tv:' + contractId + ':' + t.entryIds.join('-') + '>' + t.exitIds.join('-');
      if (store.findBySourceId(sourceId)) { skipped += 1; continue; }
      const parts = localDateParts(t.exitTime);
      store.createTrade({
        date: parts.date,
        time: localDateParts(t.entryTime).time,
        symbol: root,
        direction: t.dir === -1 ? 'short' : 'long',
        entry: round(t.entryPrice),
        exit: round(t.exitPrice),
        contracts: t.qty,
        commissions: 0,
        setup: '',
        session: '',
        notes: 'Imported from Tradovate (' + name + ')',
        source: 'tradovate',
        sourceId,
      });
      created += 1;
      results.push({ symbol: root, dir: t.dir === -1 ? 'short' : 'long', qty: t.qty });
    }
  }

  return { date: targetDate, fills: dayFills.length, created, skipped, openContractsSkipped: openLeft, results };
}

function round(n) { return Math.round(n * 1e6) / 1e6; }

async function testConnection() {
  const s = loadSettings();
  if (!s.name || !s.password || !s.cid || !s.sec) throw new Error('Missing credentials.');
  await getAccessToken(s);
  return { ok: true, env: s.env };
}

module.exports = { loadSettings, saveSettings, publicSettings, sync, testConnection, pairContractFills, symbolRoot };
