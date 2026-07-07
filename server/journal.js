// Dependency-free JSON store for market-journal entries (one per day/observation),
// separate from trades. Atomic writes, mirrors the playbooks store.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'journal.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

function readAll() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function clean(input) {
  return {
    date: String(input.date || '').slice(0, 10),
    bias: String(input.bias || ''),
    traded: input.traded === true || input.traded === 'true',
    observations: String(input.observations || ''),
    reason: String(input.reason || ''),
  };
}

function list() {
  return readAll().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function create(input) {
  const all = readAll();
  const now = new Date().toISOString();
  const e = { id: crypto.randomUUID(), ...clean(input), screenshots: [], createdAt: now, updatedAt: now };
  all.push(e);
  writeAll(all);
  return e;
}

function update(id, input) {
  const all = readAll();
  const i = all.findIndex((e) => e.id === id);
  if (i === -1) return null;
  all[i] = { ...all[i], ...clean(input), updatedAt: new Date().toISOString() };
  writeAll(all);
  return all[i];
}

function remove(id) {
  const all = readAll();
  const e = all.find((x) => x.id === id);
  if (!e) return null;
  writeAll(all.filter((x) => x.id !== id));
  return e;
}

function addScreenshot(id, filename, label) {
  const all = readAll();
  const i = all.findIndex((e) => e.id === id);
  if (i === -1) return null;
  const shot = { id: crypto.randomUUID(), filename, label: label || '' };
  all[i].screenshots = all[i].screenshots || [];
  all[i].screenshots.push(shot);
  all[i].updatedAt = new Date().toISOString();
  writeAll(all);
  return shot;
}

function removeScreenshot(id, shotId) {
  const all = readAll();
  const i = all.findIndex((e) => e.id === id);
  if (i === -1) return null;
  const shot = (all[i].screenshots || []).find((s) => s.id === shotId);
  if (!shot) return null;
  all[i].screenshots = all[i].screenshots.filter((s) => s.id !== shotId);
  all[i].updatedAt = new Date().toISOString();
  writeAll(all);
  return shot;
}

module.exports = { list, create, update, remove, addScreenshot, removeScreenshot };
