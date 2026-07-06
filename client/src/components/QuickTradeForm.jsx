import React, { useState, useMemo } from 'react';
import { api } from '../api.js';
import { previewMetrics, defaultPointValue, fmtUSD, fmtR, todayISO } from '../helpers.js';

const QUICK_SYMBOLS = ['NQ', 'ES', 'MNQ', 'MES'];

// Minimal, large-button trade entry for mobile. Only the essentials; the rest
// (setup tags, HTF context, screenshots) can be filled in later on desktop.
export default function QuickTradeForm({ onClose, onSaved, notify }) {
  const [form, setForm] = useState({ date: todayISO(), symbol: 'NQ', direction: 'long', entry: '', exit: '', contracts: '1' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const preview = useMemo(() => previewMetrics({ ...form, pointValue: defaultPointValue(form.symbol) }), [form]);

  async function save() {
    if (!form.date) return notify('Date is required');
    setSaving(true);
    try {
      await api.createTrade({ ...form, pointValue: String(defaultPointValue(form.symbol)) });
      notify('Trade saved');
      onSaved();
      onClose();
    } catch (e) { notify('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <h2>⚡ Quick add</h2>
          <button className="close-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body quick-form">
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div className="field">
            <label>Symbol</label>
            <div className="seg big" style={{ marginBottom: 6 }}>
              {QUICK_SYMBOLS.map((s) => (
                <button key={s} type="button" className={form.symbol === s ? 'active' : ''} onClick={() => set('symbol', s)}>{s}</button>
              ))}
            </div>
            <input value={form.symbol} onChange={(e) => set('symbol', e.target.value.toUpperCase())} placeholder="Other symbol" />
          </div>
          <div className="field">
            <label>Direction</label>
            <div className="seg big">
              <button type="button" className={form.direction === 'long' ? 'active' : ''} onClick={() => set('direction', 'long')}>Long</button>
              <button type="button" className={form.direction === 'short' ? 'active' : ''} onClick={() => set('direction', 'short')}>Short</button>
            </div>
          </div>
          <div className="field">
            <label>Entry</label>
            <input type="number" step="any" inputMode="decimal" value={form.entry} onChange={(e) => set('entry', e.target.value)} />
          </div>
          <div className="field">
            <label>Exit</label>
            <input type="number" step="any" inputMode="decimal" value={form.exit} onChange={(e) => set('exit', e.target.value)} />
          </div>
          <div className="field">
            <label>Contracts</label>
            <input type="number" min="0" step="1" inputMode="numeric" value={form.contracts} onChange={(e) => set('contracts', e.target.value)} />
          </div>
          <div className="quick-result">
            <div><span>Result ($)</span><b className={preview.dollars > 0 ? 'pos' : preview.dollars < 0 ? 'neg' : ''}>{preview.dollars == null ? '-' : fmtUSD(preview.dollars)}</b></div>
            <div><span>R</span><b>{preview.r == null ? '-' : fmtR(preview.r)}</b></div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn big" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save trade'}</button>
        </div>
      </div>
    </div>
  );
}
