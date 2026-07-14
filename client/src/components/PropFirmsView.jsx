import React, { useState } from 'react';
import { api } from '../api.js';
import { ACCOUNT_TYPES, fmtUSD } from '../helpers.js';

const emptyAccForm = { type: 'Eval', name: '', balance: '' };

// Manage prop firms and their accounts (type, name, current balance).
export default function PropFirmsView({ propfirms = [], onUpdate, notify }) {
  const [newFirm, setNewFirm] = useState('');
  const [renaming, setRenaming] = useState(null);   // firm id
  const [renameText, setRenameText] = useState('');
  const [accForms, setAccForms] = useState({});     // firmId -> {type,name,balance}
  const [editingAcc, setEditingAcc] = useState(null); // account id
  const [accDraft, setAccDraft] = useState(emptyAccForm);

  const accForm = (firmId) => accForms[firmId] || emptyAccForm;
  const setAccForm = (firmId, patch) =>
    setAccForms((f) => ({ ...f, [firmId]: { ...accForm(firmId), ...patch } }));

  async function run(fn, okMsg) {
    try { await fn(); onUpdate(); if (okMsg) notify(okMsg); }
    catch (e) { notify('Error: ' + e.message); }
  }

  function createFirm() {
    const name = newFirm.trim();
    if (!name) return notify('Firm name is required');
    run(async () => { await api.createPropfirm({ name }); setNewFirm(''); }, 'Firm added');
  }

  function saveRename(firm) {
    const name = renameText.trim();
    setRenaming(null);
    if (!name || name === firm.name) return;
    run(() => api.updatePropfirm(firm.id, { name }), 'Firm renamed');
  }

  function deleteFirm(f) {
    if (!confirm(`Delete ${f.name} and its ${(f.accounts || []).length} account(s)? Trades keep their data.`)) return;
    run(() => api.deletePropfirm(f.id), 'Firm deleted');
  }

  function addAccount(firmId) {
    const form = accForm(firmId);
    if (!form.name.trim()) return notify('Account name is required');
    run(async () => {
      await api.addAccount(firmId, { type: form.type, name: form.name.trim(), balance: Number(form.balance) || 0 });
      setAccForms((f) => ({ ...f, [firmId]: { ...emptyAccForm, type: form.type } }));
    }, 'Account added');
  }

  function startEditAcc(a) {
    setEditingAcc(a.id);
    setAccDraft({ type: a.type || 'Eval', name: a.name || '', balance: String(a.balance ?? '') });
  }

  function saveAcc(firmId, accId) {
    if (!accDraft.name.trim()) return notify('Account name is required');
    setEditingAcc(null);
    run(() => api.updateAccount(firmId, accId, {
      type: accDraft.type, name: accDraft.name.trim(), balance: Number(accDraft.balance) || 0,
    }), 'Account updated');
  }

  function deleteAcc(firmId, a) {
    if (!confirm(`Remove account ${a.name}? Trades linked to it keep their data.`)) return;
    run(() => api.deleteAccount(firmId, a.id), 'Account removed');
  }

  const typeSelect = (value, onChange) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 130 }}>
      {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Add prop firm</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newFirm} onChange={(e) => setNewFirm(e.target.value)}
            placeholder="Firm name (e.g. Apex, Topstep, TPT)" style={{ flex: 1, maxWidth: 340 }}
            onKeyDown={(e) => e.key === 'Enter' && createFirm()}
          />
          <button className="btn" onClick={createFirm}>+ Add firm</button>
        </div>
      </div>

      {propfirms.map((f) => (
        <div key={f.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {renaming === f.id ? (
              <input
                autoFocus value={renameText} onChange={(e) => setRenameText(e.target.value)}
                onBlur={() => saveRename(f)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveRename(f); if (e.key === 'Escape') setRenaming(null); }}
                style={{ maxWidth: 240 }}
              />
            ) : (
              <h3 style={{ margin: 0 }}>{f.name}</h3>
            )}
            <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => { setRenaming(f.id); setRenameText(f.name); }}>Rename</button>
            <div style={{ flex: 1 }} />
            <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => deleteFirm(f)}>Delete firm</button>
          </div>

          {(f.accounts || []).length > 0 && (
            <div className="table-wrap" style={{ marginBottom: 10 }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr><th style={{ textAlign: 'left' }}>Type</th><th style={{ textAlign: 'left' }}>Account name</th><th className="num" style={{ textAlign: 'right' }}>Balance</th><th /></tr>
                </thead>
                <tbody>
                  {f.accounts.map((a) => (
                    <tr key={a.id}>
                      {editingAcc === a.id ? (
                        <>
                          <td>{typeSelect(accDraft.type, (v) => setAccDraft((d) => ({ ...d, type: v })))}</td>
                          <td><input value={accDraft.name} onChange={(e) => setAccDraft((d) => ({ ...d, name: e.target.value }))} /></td>
                          <td className="num">
                            <input
                              type="number" step="any" value={accDraft.balance} style={{ width: 130, textAlign: 'right' }}
                              onChange={(e) => setAccDraft((d) => ({ ...d, balance: e.target.value }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button className="btn" style={{ fontSize: 12 }} onClick={() => saveAcc(f.id, a.id)}>Save</button>{' '}
                            <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => setEditingAcc(null)}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{a.type || '-'}</td>
                          <td>{a.name}</td>
                          <td className="num" style={{ textAlign: 'right' }}>{fmtUSD(a.balance || 0)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => startEditAcc(a)}>Edit</button>{' '}
                            <button className="btn ghost" style={{ fontSize: 12 }} onClick={() => deleteAcc(f.id, a)}>Remove</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {typeSelect(accForm(f.id).type, (v) => setAccForm(f.id, { type: v }))}
            <input
              placeholder="Account name (e.g. APEX4009070000055)" value={accForm(f.id).name}
              onChange={(e) => setAccForm(f.id, { name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addAccount(f.id)}
              style={{ flex: 1, minWidth: 220, maxWidth: 340 }}
            />
            <input
              type="number" step="any" placeholder="Current balance" value={accForm(f.id).balance}
              onChange={(e) => setAccForm(f.id, { balance: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addAccount(f.id)}
              style={{ width: 150 }}
            />
            <button className="btn" onClick={() => addAccount(f.id)}>+ Add account</button>
          </div>
        </div>
      ))}

      {!propfirms.length && <div className="hint">No prop firms yet — add one above, then add its accounts (Eval, Funded…) with their names and balances.</div>}
    </div>
  );
}
