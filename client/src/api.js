const J = { 'Content-Type': 'application/json' };

async function req(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) {
    let msg = r.statusText;
    try { msg = (await r.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : r.text();
}

export const api = {
  authStatus: () => req('/api/auth/status'),
  me: () => req('/api/auth/me'),
  login: (username, password) => req('/api/auth/login', { method: 'POST', headers: J, body: JSON.stringify({ username, password }) }),
  register: (username, password) => req('/api/auth/register', { method: 'POST', headers: J, body: JSON.stringify({ username, password }) }),
  logout: () => req('/api/auth/logout', { method: 'POST' }),
  listTrades: () => req('/api/trades'),
  createTrade: (t) => req('/api/trades', { method: 'POST', headers: J, body: JSON.stringify(t) }),
  updateTrade: (id, t) => req('/api/trades/' + id, { method: 'PUT', headers: J, body: JSON.stringify(t) }),
  deleteTrade: (id) => req('/api/trades/' + id, { method: 'DELETE' }),
  meta: () => req('/api/meta'),
  uploadScreenshot: (id, file, label) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('label', label || '');
    return req('/api/trades/' + id + '/screenshots', { method: 'POST', body: fd });
  },
  deleteScreenshot: (id, sid) => req('/api/trades/' + id + '/screenshots/' + sid, { method: 'DELETE' }),
  importCsv: (csv) => req('/api/import/csv', { method: 'POST', headers: J, body: JSON.stringify({ csv }) }),
  tvGetSettings: () => req('/api/tradovate/settings'),
  tvSaveSettings: (s) => req('/api/tradovate/settings', { method: 'POST', headers: J, body: JSON.stringify(s) }),
  tvTest: () => req('/api/tradovate/test', { method: 'POST', headers: J, body: '{}' }),
  tvSync: (date) => req('/api/tradovate/sync', { method: 'POST', headers: J, body: JSON.stringify({ date }) }),
  restore: (trades) => req('/api/restore', { method: 'POST', headers: J, body: JSON.stringify({ trades }) }),
  listPlaybooks: () => req('/api/playbooks'),
  createPlaybook: (p) => req('/api/playbooks', { method: 'POST', headers: J, body: JSON.stringify(p) }),
  updatePlaybook: (id, p) => req('/api/playbooks/' + id, { method: 'PUT', headers: J, body: JSON.stringify(p) }),
  deletePlaybook: (id) => req('/api/playbooks/' + id, { method: 'DELETE' }),
  uploadPlaybookShot: (id, file, label) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('label', label || '');
    return req('/api/playbooks/' + id + '/screenshots', { method: 'POST', body: fd });
  },
  deletePlaybookShot: (id, sid) => req('/api/playbooks/' + id + '/screenshots/' + sid, { method: 'DELETE' }),
};
