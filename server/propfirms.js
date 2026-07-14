// Prop firm and account management store.
// Firms have custom accounts (Eval, Funded, etc.) with account names and starting balances.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'propfirms.json');

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
ensureDirs();

function readAll() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(firms) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(firms, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function listFirms() {
  return readAll();
}

function createFirm(input) {
  const firms = readAll();
  const f = {
    id: crypto.randomUUID(),
    name: input.name || '',
    accounts: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  firms.push(f);
  writeAll(firms);
  return f;
}

function updateFirm(id, input) {
  const firms = readAll();
  const i = firms.findIndex((x) => x.id === id);
  if (i === -1) return null;
  firms[i] = { ...firms[i], name: input.name, updatedAt: new Date().toISOString() };
  writeAll(firms);
  return firms[i];
}

function deleteFirm(id) {
  const firms = readAll();
  const f = firms.find((x) => x.id === id);
  if (!f) return false;
  writeAll(firms.filter((x) => x.id !== id));
  return true;
}

const ACCOUNT_STATUSES = ['active', 'passed', 'blown'];
const validStatus = (s) => (ACCOUNT_STATUSES.includes(s) ? s : 'active');

function addAccount(firmId, input) {
  const firms = readAll();
  const i = firms.findIndex((x) => x.id === firmId);
  if (i === -1) return null;
  const acc = {
    id: crypto.randomUUID(),
    type: input.type || '', // Eval, Funded, Demo Funded, Live
    name: input.name || '',
    balance: Number(input.balance) || 0,
    status: validStatus(input.status),
    createdAt: new Date().toISOString(),
  };
  firms[i].accounts = firms[i].accounts || [];
  firms[i].accounts.push(acc);
  firms[i].updatedAt = new Date().toISOString();
  writeAll(firms);
  return acc;
}

function updateAccount(firmId, accId, input) {
  const firms = readAll();
  const f = firms.find((x) => x.id === firmId);
  if (!f) return null;
  const acc = f.accounts.find((a) => a.id === accId);
  if (!acc) return null;
  acc.type = input.type || acc.type;
  acc.name = input.name || acc.name;
  if (input.balance != null) acc.balance = Number(input.balance);
  if (input.status != null) acc.status = validStatus(input.status);
  f.updatedAt = new Date().toISOString();
  writeAll(firms);
  return acc;
}

function deleteAccount(firmId, accId) {
  const firms = readAll();
  const f = firms.find((x) => x.id === firmId);
  if (!f) return false;
  const acc = f.accounts.find((a) => a.id === accId);
  if (!acc) return false;
  f.accounts = f.accounts.filter((a) => a.id !== accId);
  f.updatedAt = new Date().toISOString();
  writeAll(firms);
  return true;
}

function getAccount(firmId, accId) {
  const firms = readAll();
  const f = firms.find((x) => x.id === firmId);
  if (!f) return null;
  return f.accounts.find((a) => a.id === accId) || null;
}

function getFirmForAccount(accId) {
  const firms = readAll();
  for (const f of firms) {
    const acc = f.accounts.find((a) => a.id === accId);
    if (acc) return { firm: f, account: acc };
  }
  return null;
}

module.exports = {
  listFirms, createFirm, updateFirm, deleteFirm,
  addAccount, updateAccount, deleteAccount, getAccount, getFirmForAccount,
};
