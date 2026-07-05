import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function TradovateSettings({ onClose, notify }) {
  const [s, setS] = useState(null);
  const [form, setForm] = useState({ env: 'demo', appId: '', name: '', password: '', cid: '', sec: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.tvGetSettings().then((cur) => {
      setS(cur);
      setForm((f) => ({ ...f, env: cur.env || 'demo', appId: cur.appId || 'TradezillaJournal', name: cur.name || '' }));
    }).catch((e) => notify('Could not load settings: ' + e.message));
  }, [notify]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      // send secrets only if the user typed something new
      const payload = { env: form.env, appId: form.appId, name: form.name };
      if (form.password) payload.password = form.password;
      if (form.cid) payload.cid = form.cid;
      if (form.sec) payload.sec = form.sec;
      const cur = await api.tvSaveSettings(payload);
      setS(cur);
      setForm((f) => ({ ...f, password: '', cid: '', sec: '' }));
      notify('Tradovate settings saved');
    } catch (e) { notify('Save failed: ' + e.message); }
    finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    try { const r = await api.tvTest(); notify('Connection OK (' + r.env + ')'); }
    catch (e) { notify('Connection failed: ' + e.message); }
    finally { setBusy(false); }
  }

  if (!s) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <h2>Tradovate connection</h2>
          <button className="close-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="hint" style={{ marginTop: 0 }}>
            Requires Tradovate's paid API Access add-on and an API key (cid + secret) created in your
            Tradovate account. Credentials are stored only on this server, in the mounted data folder.
          </p>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label>Environment</label>
              <div className="seg">
                <button type="button" className={form.env === 'demo' ? 'active' : ''} onClick={() => set('env', 'demo')}>Demo</button>
                <button type="button" className={form.env === 'live' ? 'active' : ''} onClick={() => set('env', 'live')}>Live</button>
              </div>
            </div>
            <div className="field">
              <label>App name (appId)</label>
              <input value={form.appId} onChange={(e) => set('appId', e.target.value)} placeholder="TradezillaJournal" />
            </div>
            <div className="field">
              <label>Username</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
            </div>
            <div className="field">
              <label>Password {s.hasPassword && <span className="muted">(saved)</span>}</label>
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={s.hasPassword ? 'leave blank to keep' : ''} autoComplete="new-password" />
            </div>
            <div className="field">
              <label>API key id (cid) {s.hasApiKey && <span className="muted">(saved)</span>}</label>
              <input value={form.cid} onChange={(e) => set('cid', e.target.value)} placeholder={s.hasApiKey ? 'leave blank to keep' : ''} autoComplete="off" />
            </div>
            <div className="field">
              <label>API secret (sec)</label>
              <input type="password" value={form.sec} onChange={(e) => set('sec', e.target.value)} placeholder={s.hasApiKey ? 'leave blank to keep' : ''} autoComplete="new-password" />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={test} disabled={busy}>Test connection</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>Close</button>
            <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
