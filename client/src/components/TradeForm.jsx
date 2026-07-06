import React, { useState, useMemo, useRef } from 'react';
import { api } from '../api.js';
import { previewMetrics, defaultPointValue, fmtUSD, fmtR, fmtNum, SESSIONS, EMOTIONS, todayISO } from '../helpers.js';

const QUICK_SYMBOLS = ['NQ', 'ES', 'MNQ', 'MES'];
const QUICK_NEWS = ['CPI', 'NFP', 'FOMC', 'PMI', 'PCE', 'GDP', 'Retail Sales', 'Jobless Claims', 'ISM', 'Fed speech'];
const QUICK_EMOTIONS = ['FOMO', 'Patient', 'Revenge trade', 'Confident', 'Anxious', 'Greedy', 'Bored', 'Disciplined'];
const MISTAKES = [
  'Moved stop loss too early', 'Position too large (overleveraged)', 'Did not follow strategy',
  'Entered too early (FOMO entry)', 'Took profit too early', 'Let a loss run too long',
  'No stop loss set', 'Revenge trade after a loss', 'Overtraded (too many trades)', 'Traded against HTF bias',
];

// Dropdown with a quick-pick list plus a free-text "Other…" fallback,
// so a custom value (e.g. a custom emotion) can still be typed in.
function ChoiceField({ label, value, options, onChange, placeholder, full }) {
  const [customMode, setCustomMode] = useState(!!value && !options.includes(value));
  const selectValue = customMode ? '__other__' : (value || '');
  return (
    <div className={'field' + (full ? ' full' : '')}>
      <label>{label}</label>
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === '__other__') { setCustomMode(true); onChange(''); }
          else { setCustomMode(false); onChange(e.target.value); }
        }}
      >
        <option value="">- none -</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">Other…</option>
      </select>
      {customMode && (
        <input
          autoFocus value={value || ''} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}

const blank = () => ({
  date: todayISO(), time: '', exitTime: '', symbol: 'NQ', direction: 'long',
  entry: '', exit: '', contracts: '1', stopLoss: '', takeProfit: '',
  pointValue: String(defaultPointValue('NQ')), commissions: '', setup: '',
  model: '', entryModel: '', htfDelivery: '', newsEvent: '', grade: '',
  emotionEntry: '', emotionExit: '', mistake: '',
  session: 'NY', notes: '', rating: '', planFollowed: false, emotion: '', mistakes: '', screenshots: [],
});

export default function TradeForm({ trade, onClose, onSaved, notify }) {
  const [form, setForm] = useState(() => (trade ? normalize(trade) : blank()));
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef();
  const isEditing = !!form.id;

  const preview = useMemo(() => previewMetrics(form), [form]);

  function set(k, v) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'symbol' && (!f.pointValue || f.pointValue === String(defaultPointValue(f.symbol)))) {
        next.pointValue = String(defaultPointValue(v));
      }
      return next;
    });
  }

  async function save() {
    if (!form.date) return notify('Date is required');
    setSaving(true);
    try {
      const payload = stripComputed(form);
      let saved;
      if (isEditing) saved = await api.updateTrade(form.id, payload);
      else saved = await api.createTrade(payload);
      onSaved(saved);
      if (!isEditing) {
        // keep modal open in edit mode so screenshots can be attached
        setForm(normalize(saved));
        notify('Trade saved. You can now attach screenshots.');
      } else {
        notify('Trade updated');
      }
    } catch (e) {
      notify('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function upload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !form.id) return;
    const label = prompt('Label for these screenshot(s)? (e.g. Entry, Exit)') || '';
    try {
      for (const file of files) {
        const shot = await api.uploadScreenshot(form.id, file, label);
        setForm((f) => ({ ...f, screenshots: [...(f.screenshots || []), shot] }));
      }
      onSaved(); // refresh list
      notify('Screenshot added');
    } catch (err) {
      notify('Upload failed: ' + err.message);
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function delShot(sid) {
    await api.deleteScreenshot(form.id, sid);
    setForm((f) => ({ ...f, screenshots: f.screenshots.filter((s) => s.id !== sid) }));
    onSaved();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isEditing ? 'Edit trade' : 'New trade'}</h2>
          <button className="close-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date || ''} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="field">
              <label>Time (entry)</label>
              <input type="time" value={form.time || ''} onChange={(e) => set('time', e.target.value)} />
            </div>
            <div className="field">
              <label>Time (exit)</label>
              <input type="time" value={form.exitTime || ''} onChange={(e) => set('exitTime', e.target.value)} />
            </div>
            <div className="field">
              <label>Session</label>
              <select value={form.session || ''} onChange={(e) => set('session', e.target.value)}>
                <option value="">-</option>
                {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Symbol</label>
              <div className="seg" style={{ marginBottom: 6 }}>
                {QUICK_SYMBOLS.map((s) => (
                  <button key={s} className={form.symbol === s ? 'active' : ''} type="button" onClick={() => set('symbol', s)}>{s}</button>
                ))}
              </div>
              <input value={form.symbol || ''} onChange={(e) => set('symbol', e.target.value.toUpperCase())} placeholder="Other symbol" />
            </div>
            <div className="field">
              <label>Direction</label>
              <div className="seg">
                <button type="button" className={form.direction === 'long' ? 'active' : ''} onClick={() => set('direction', 'long')}>Long</button>
                <button type="button" className={form.direction === 'short' ? 'active' : ''} onClick={() => set('direction', 'short')}>Short</button>
              </div>
            </div>
            <div className="field">
              <label>Contracts</label>
              <input type="number" min="0" step="1" value={form.contracts || ''} onChange={(e) => set('contracts', e.target.value)} />
            </div>

            <div className="field">
              <label>Entry price</label>
              <input type="number" step="any" value={form.entry || ''} onChange={(e) => set('entry', e.target.value)} />
            </div>
            <div className="field">
              <label>Exit price</label>
              <input type="number" step="any" value={form.exit || ''} onChange={(e) => set('exit', e.target.value)} />
            </div>
            <div className="field">
              <label>Point value ($)</label>
              <input type="number" step="any" value={form.pointValue || ''} onChange={(e) => set('pointValue', e.target.value)} />
            </div>

            <div className="field">
              <label>Stop loss</label>
              <input type="number" step="any" value={form.stopLoss || ''} onChange={(e) => set('stopLoss', e.target.value)} />
            </div>
            <div className="field">
              <label>Take profit</label>
              <input type="number" step="any" value={form.takeProfit || ''} onChange={(e) => set('takeProfit', e.target.value)} />
            </div>
            <div className="field">
              <label>Commissions ($)</label>
              <input type="number" step="any" value={form.commissions || ''} onChange={(e) => set('commissions', e.target.value)} />
            </div>

            <div className="field">
              <label>Setup / strategy</label>
              <input value={form.setup || ''} onChange={(e) => set('setup', e.target.value)} placeholder="e.g. ORB, Reversal" />
            </div>
            <div className="field">
              <label>Model</label>
              <input value={form.model || ''} onChange={(e) => set('model', e.target.value)} placeholder="e.g. 2022 model, Silver Bullet" />
            </div>
            <div className="field">
              <label>Entry model</label>
              <input value={form.entryModel || ''} onChange={(e) => set('entryModel', e.target.value)} placeholder="e.g. FVG, OTE, Breaker" />
            </div>
            <div className="field">
              <label>HTF delivery</label>
              <input value={form.htfDelivery || ''} onChange={(e) => set('htfDelivery', e.target.value)} placeholder="e.g. bullish, bearish" />
            </div>
            <div className="field">
              <label>Grade</label>
              <input value={form.grade || ''} onChange={(e) => set('grade', e.target.value)} placeholder="e.g. A, B+, 8/10" />
            </div>
            <ChoiceField
              label="News (red folder)" value={form.newsEvent} options={QUICK_NEWS}
              onChange={(v) => set('newsEvent', v)} placeholder="Custom news event"
            />
            <ChoiceField
              label="Emotion at entry" value={form.emotionEntry} options={QUICK_EMOTIONS}
              onChange={(v) => set('emotionEntry', v)} placeholder="Custom emotion"
            />
            <ChoiceField
              label="Emotion at exit" value={form.emotionExit} options={QUICK_EMOTIONS}
              onChange={(v) => set('emotionExit', v)} placeholder="Custom emotion"
            />
            <div className="field full">
              <label>Mental mistake</label>
              <select value={form.mistake || ''} onChange={(e) => set('mistake', e.target.value)}>
                <option value="">- none -</option>
                {MISTAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Rating</label>
              <select value={form.rating || ''} onChange={(e) => set('rating', e.target.value)}>
                <option value="">-</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'\u2605'.repeat(n)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Emotion</label>
              <select value={form.emotion || ''} onChange={(e) => set('emotion', e.target.value)}>
                <option value="">-</option>
                {EMOTIONS.map((em) => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Plan followed</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                <input type="checkbox" style={{ width: 18, height: 18 }} checked={!!form.planFollowed} onChange={(e) => set('planFollowed', e.target.checked)} />
                <span className="hint">{form.planFollowed ? 'Yes' : 'No'}</span>
              </label>
            </div>
            <div className="field full">
              <label>Mistakes (comma separated)</label>
              <input value={form.mistakes || ''} onChange={(e) => set('mistakes', e.target.value)} placeholder="e.g. moved stop, chased entry" />
            </div>
            <div className="field full">
              <label>Notes</label>
              <textarea rows="2" value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="computed" style={{ marginTop: 16 }}>
            <div><span>Result (points)</span><b className={cls(preview.points)}>{fmtNum(preview.points)}</b></div>
            <div><span>Result ($)</span><b className={cls(preview.dollars)}>{fmtUSD(preview.dollars)}</b></div>
            <div><span>Risk ($)</span><b>{preview.risk == null ? '-' : fmtUSD(preview.risk)}</b></div>
            <div><span>R multiple</span><b className={cls(preview.r)}>{fmtR(preview.r)}</b></div>
          </div>

          <div style={{ marginTop: 18 }}>
            <label className="hint">Screenshots (charts for entry / exit)</label>
            {!isEditing && <div className="hint">Save the trade first, then you can attach screenshots.</div>}
            {isEditing && (
              <>
                <div className="shots">
                  {(form.screenshots || []).map((s) => (
                    <div className="shot" key={s.id}>
                      <img src={'/uploads/' + s.filename} onClick={() => setLightbox('/uploads/' + s.filename)} alt={s.label} />
                      <button className="del" onClick={() => delShot(s.id)}>×</button>
                      {s.label && <div className="cap">{s.label}</div>}
                    </div>
                  ))}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={upload} style={{ marginTop: 10 }} />
              </>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <span className="hint">{isEditing ? 'Editing existing trade' : 'New entry'}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>Close</button>
            <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : (isEditing ? 'Save changes' : 'Save trade')}</button>
          </div>
        </div>
      </div>
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}><img src={lightbox} alt="" /></div>
      )}
    </div>
  );
}

const cls = (n) => (n == null ? '' : n > 0 ? 'pos' : n < 0 ? 'neg' : '');

function normalize(t) {
  const o = { ...t };
  ['entry', 'exit', 'contracts', 'stopLoss', 'takeProfit', 'pointValue', 'commissions'].forEach((k) => {
    o[k] = t[k] == null ? '' : String(t[k]);
  });
  o.screenshots = t.screenshots || [];
  return o;
}

function stripComputed(form) {
  const { id, resultPoints, resultDollars, riskDollars, rMultiple, holdingMinutes, screenshots, createdAt, updatedAt, ...rest } = form;
  return rest;
}
