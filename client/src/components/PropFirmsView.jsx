import React, { useState } from 'react';
import { api } from '../api.js';

export default function PropFirmsView({ propfirms = [], onUpdate, notify }) {
  const [editing, setEditing] = useState(null);
  const [newFirm, setNewFirm] = useState('');
  const [expanding, setExpanding] = useState({});
  const [addingAcc, setAddingAcc] = useState(null);
  const [accForm, setAccForm] = useState({ type: '', name: '', balance: '' });
  const [editingAcc, setEditingAcc] = useState(null);

  async function createFirm() {
    if (!newFirm.trim()) return notify('Firm name is required');
    try {
      await api.createPropfirm({ name: newFirm });
      setNewFirm('');
      onUpdate();
      notify('Firm created');
    } catch (e) {
      notify('Error: ' + e.message);
    }
  }

  async function updateFirm(id, name) {
    try {
      await api.updatePropfirm(id, { name });
      setEditing(null);
      onUpdate();
      notify('Firm updated');
    } catch (e) {
      notify('Error: ' + e.message);
    }
  }

  async function deleteFirm(id) {
    if (!confirm('Delete this firm?')) return;
    try {
      await api.deletePropfirm(id);
      onUpdate();
      notify('Firm deleted');
    } catch (e) {
      notify('Error: ' + e.message);
    }
  }

  async function addAccount(firmId) {
    if (!accForm.type.trim() || !accForm.name.trim()) return notify('Type and name are required');
    try {
      await api.addAccount(firmId, {
        type: accForm.type,
        name: accForm.name,
        balance: Number(accForm.balance) || 0,
      });
      setAddingAcc(null);
      setAccForm({ type: '', name: '', balance: '' });
      onUpdate();
      notify('Account added');
    } catch (e) {
      notify('Error: ' + e.message);
    }
  }

  async function updateAccount(firmId, accId, type, name, balance) {
    try {
      await api.updateAccount(firmId, accId, {
        type,
        name,
        balance: Number(balance) || 0,
      });
      setEditingAcc(null);
      onUpdate();
      notify('Account updated');
    } catch (e) {
      notify('Error: ' + e.message);
    }
  }

  async function deleteAccount(firmId, accId) {
    if (!confirm('Delete this account?')) return;
    try {
      await api.deleteAccount(firmId, accId);
      onUpdate();
      notify('Account deleted');
    } catch (e) {
      notify('Error: ' + e.message);
    }
  }

  return (
    <div>
      <h2>Prop firms & accounts</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Add new firm</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={newFirm} onChange={(e) => setNewFirm(e.target.value)}
            placeholder="Firm name (e.g. Topstep, Apex)" style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && createFirm()}
          />
          <button className="btn" onClick={createFirm}>+ Add</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {propfirms.map((f) => (
          <div key={f.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                {editing === f.id ? (
                  <input
                    autoFocus value={f.name} onChange={(e) => setEditing(null)}
                    onBlur={() => updateFirm(f.id, f.name)}
                    onKeyDown={(e) => e.key === 'Enter' && updateFirm(f.id, f.name)}
                  />
                ) : (
                  <h3 style={{ margin: 0, cursor: 'pointer' }} onClick={() => setEditing(f.id)}>
                    {f.name}
                  </h3>
                )}
              </div>
              <button className="btn ghost" onClick={() => deleteFirm(f.id)}>Delete</button>
              <button className="btn ghost" onClick={() => setExpanding((ex) => ({ ...ex, [f.id]: !ex[f.id] }))}>
                {expanding[f.id] ? '▼' : '▶'} {(f.accounts || []).length} account{(f.accounts || []).length === 1 ? '' : 's'}
              </button>
            </div>

            {expanding[f.id] && (
              <>
                <table style={{ width: '100%', marginBottom: 16 }}>
                  <tbody>
                    {(f.accounts || []).map((a) => (
                      <tr key={a.id}>
                        <td style={{ padding: '8px 0' }}>
                          {editingAcc === a.id ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                value={a.type} onChange={(e) => setEditingAcc(null)}
                                placeholder="Type" style={{ width: 100 }}
                                onBlur={() => updateAccount(f.id, a.id, a.type, a.name, a.balance)}
                              />
                              <input
                                value={a.name} onChange={(e) => setEditingAcc(null)}
                                placeholder="Name" style={{ flex: 1 }}
                                onBlur={() => updateAccount(f.id, a.id, a.type, a.name, a.balance)}
                              />
                              <input
                                type="number" value={a.balance} onChange={(e) => setEditingAcc(null)}
                                placeholder="Balance" style={{ width: 100 }}
                                onBlur={() => updateAccount(f.id, a.id, a.type, a.name, a.balance)}
                              />
                              <button className="btn ghost" onClick={() => setEditingAcc(null)}>×</button>
                            </div>
                          ) : (
                            <>
                              <span style={{ fontWeight: 600 }}>{a.type}</span> {a.name}
                              <span className="hint" style={{ float: 'right' }}>
                                ${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                              <button
                                className="btn ghost" style={{ fontSize: 12, marginLeft: 12 }}
                                onClick={() => setEditingAcc(a.id)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn ghost" style={{ fontSize: 12 }}
                                onClick={() => deleteAccount(f.id, a.id)}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {addingAcc === f.id ? (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 4, marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        placeholder="Type (Eval, Funded, etc.)" value={accForm.type}
                        onChange={(e) => setAccForm({ ...accForm, type: e.target.value })} style={{ width: 120 }}
                      />
                      <input
                        placeholder="Account name" value={accForm.name}
                        onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} style={{ flex: 1 }}
                      />
                      <input
                        type="number" placeholder="Starting balance" value={accForm.balance}
                        onChange={(e) => setAccForm({ ...accForm, balance: e.target.value })} style={{ width: 120 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn" onClick={() => addAccount(f.id)}>Add account</button>
                      <button className="btn ghost" onClick={() => { setAddingAcc(null); setAccForm({ type: '', name: '', balance: '' }); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn ghost" onClick={() => setAddingAcc(f.id)}>+ Add account</button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
