import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api } from '../api.js';
import { ICT_SETUPS, setupTagsOf, computeStats, fmtUSD, fmtNum, pnlClass } from '../helpers.js';

const blankPb = () => ({ name: '', description: '', rules: [''], setupTag: '', screenshots: [] });

function StatMini({ label, stats, tone }) {
  return (
    <div className={'card insight ' + tone} style={{ padding: 12 }}>
      <div className="hint" style={{ marginBottom: 6 }}>{label} ({stats.count} trades)</div>
      <div className="acct-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div><span>Win rate</span><b>{fmtNum(stats.winRate, 1)}%</b></div>
        <div><span>Profit factor</span><b>{stats.profitFactor === Infinity ? '∞' : fmtNum(stats.profitFactor, 2)}</b></div>
        <div><span>P&L</span><b className={pnlClass(stats.totalPnl)}>{fmtUSD(stats.totalPnl)}</b></div>
        <div><span>Expectancy</span><b className={pnlClass(stats.expectancy)}>{fmtUSD(stats.expectancy)}</b></div>
      </div>
    </div>
  );
}

function PlaybookEditor({ initial, onClose, onSaved, notify, setupOptions }) {
  const [pb, setPb] = useState(() => ({ ...blankPb(), ...initial, rules: (initial && initial.rules && initial.rules.length ? initial.rules : ['']) }));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const isEditing = !!pb.id;

  const set = (k, v) => setPb((p) => ({ ...p, [k]: v }));
  const setRule = (i, v) => setPb((p) => ({ ...p, rules: p.rules.map((r, j) => (j === i ? v : r)) }));
  const addRule = () => setPb((p) => ({ ...p, rules: [...p.rules, ''] }));
  const delRule = (i) => setPb((p) => ({ ...p, rules: p.rules.filter((_, j) => j !== i) }));

  async function save() {
    if (!pb.name.trim()) return notify('Playbook name is required');
    setSaving(true);
    try {
      const payload = { name: pb.name, description: pb.description, rules: pb.rules.filter((r) => r.trim()), setupTag: pb.setupTag };
      const saved = isEditing ? await api.updatePlaybook(pb.id, payload) : await api.createPlaybook(payload);
      if (!isEditing) { setPb({ ...saved, rules: saved.rules.length ? saved.rules : [''] }); notify('Playbook saved. You can now add screenshots.'); }
      else notify('Playbook updated');
      onSaved();
    } catch (e) { notify('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  async function upload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !pb.id) return;
    const label = prompt('Label for this screenshot? (optional)') || '';
    try {
      for (const file of files) {
        const shot = await api.uploadPlaybookShot(pb.id, file, label);
        setPb((p) => ({ ...p, screenshots: [...(p.screenshots || []), shot] }));
      }
      onSaved();
    } catch (err) { notify('Upload failed: ' + err.message); }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function delShot(sid) {
    await api.deletePlaybookShot(pb.id, sid);
    setPb((p) => ({ ...p, screenshots: p.screenshots.filter((s) => s.id !== sid) }));
    onSaved();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isEditing ? 'Edit playbook' : 'New playbook'}</h2>
          <button className="close-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="field"><label>Setup name</label>
            <input value={pb.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Silver Bullet 10-11am" />
          </div>
          <div className="field"><label>Linked setup tag</label>
            <select value={pb.setupTag} onChange={(e) => set('setupTag', e.target.value)}>
              <option value="">- none -</option>
              {setupOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="hint">Trades tagged with this setup are auto-linked to this playbook.</div>
          </div>
          <div className="field"><label>Description</label>
            <textarea rows="2" value={pb.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="field"><label>Rules</label>
            {pb.rules.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input value={r} onChange={(e) => setRule(i, e.target.value)} placeholder={`Rule ${i + 1}`} />
                <button type="button" className="btn ghost sm" onClick={() => delRule(i)}>×</button>
              </div>
            ))}
            <button type="button" className="btn ghost sm" onClick={addRule}>+ Add rule</button>
          </div>
          <div className="field"><label>Example screenshots</label>
            {!isEditing && <div className="hint">Save first, then add screenshots.</div>}
            {isEditing && (
              <>
                <div className="shots">
                  {(pb.screenshots || []).map((s) => (
                    <div className="shot" key={s.id}>
                      <img src={'/uploads/' + s.filename} alt={s.label} />
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
          <span className="hint">{isEditing ? 'Editing playbook' : 'New playbook'}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>Close</button>
            <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : (isEditing ? 'Save changes' : 'Save playbook')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaybookView({ trades, notify, onChanged }) {
  const [playbooks, setPlaybooks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try { setPlaybooks(await api.listPlaybooks()); if (onChanged) onChanged(); } catch (e) { notify('Could not load playbooks: ' + e.message); }
    finally { setLoaded(true); }
  };
  useEffect(() => { load(); }, []);

  const setupOptions = useMemo(() => {
    const fromTrades = new Set();
    trades.forEach((t) => setupTagsOf(t).forEach((tag) => fromTrades.add(tag)));
    return Array.from(new Set([...ICT_SETUPS, ...fromTrades]));
  }, [trades]);

  async function del(pb) {
    if (!confirm(`Delete playbook "${pb.name}"?`)) return;
    try { await api.deletePlaybook(pb.id); notify('Playbook deleted'); load(); }
    catch (e) { notify('Delete failed: ' + e.message); }
  }

  function tradesFor(pb) {
    // A trade belongs to a playbook if explicitly assigned (playbookId) or, as a
    // fallback, if it carries the playbook's linked setup tag.
    return trades.filter((t) => t.playbookId === pb.id || (pb.setupTag && setupTagsOf(t).includes(pb.setupTag)));
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>Playbook</div>
        <button className="btn" onClick={() => setEditing({})}>+ New playbook</button>
      </div>

      {loaded && !playbooks.length && (
        <div className="empty-state">No playbooks yet. Create one per setup to track rule discipline.</div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
        {playbooks.map((pb) => {
          const linked = tradesFor(pb);
          const followed = computeStats(linked.filter((t) => t.rulesFollowed === true || t.rulesFollowed === 'true'));
          const broken = computeStats(linked.filter((t) => t.rulesFollowed === false || t.rulesFollowed === 'false'));
          return (
            <div className="card" key={pb.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>{pb.name}</h3>
                  {pb.setupTag && <span className="tag">{pb.setupTag}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn ghost sm" onClick={() => setEditing(pb)}>Edit</button>
                  <button className="btn danger sm" onClick={() => del(pb)}>Del</button>
                </div>
              </div>
              {pb.description && <p className="hint" style={{ marginTop: 8 }}>{pb.description}</p>}
              {pb.rules && pb.rules.length > 0 && (
                <ul className="pb-rules">{pb.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
              )}
              {(pb.screenshots || []).length > 0 && (
                <div className="shots" style={{ marginTop: 8 }}>
                  {pb.screenshots.map((s) => <div className="shot" key={s.id}><img src={'/uploads/' + s.filename} alt={s.label} /></div>)}
                </div>
              )}
              <div className="section-title" style={{ fontSize: 13, marginTop: 14 }}>Rules followed vs broken</div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <StatMini label="Rules followed" stats={followed} tone="good" />
                <StatMini label="Rules broken" stats={broken} tone="bad" />
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <PlaybookEditor
          initial={editing.id ? editing : null}
          setupOptions={setupOptions}
          onClose={() => setEditing(null)}
          onSaved={load}
          notify={notify}
        />
      )}
    </div>
  );
}
