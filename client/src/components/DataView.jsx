import React, { useRef, useState } from 'react';
import { api } from '../api.js';
import { todayISO } from '../helpers.js';
import TradovateSettings from './TradovateSettings.jsx';
import PropFirmsView from './PropFirmsView.jsx';

export default function DataView({ trades, onChanged, notify }) {
  const csvRef = useRef();
  const jsonRef = useRef();
  const [busy, setBusy] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  const [syncDate, setSyncDate] = useState(todayISO());
  const [syncing, setSyncing] = useState(false);
  const [propfirms, setPropfirms] = useState([]);

  function download(url) { window.open(url, '_blank'); }

  async function loadPropfirms() {
    try {
      const pf = await api.listPropfirms();
      setPropfirms(pf);
    } catch (e) {
      notify('Failed to load prop firms: ' + e.message);
    }
  }

  React.useEffect(() => {
    loadPropfirms();
  }, []);

  async function importCsv(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await api.importCsv(await file.text());
      notify(`Imported ${res.imported} trade(s)`);
      onChanged();
    } catch (err) { notify('Import failed: ' + err.message); }
    finally { setBusy(false); if (csvRef.current) csvRef.current.value = ''; }
  }

  async function restore(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Restoring replaces ALL current trades with the backup contents. A safety backup of current data is saved on the server first. Continue?')) {
      if (jsonRef.current) jsonRef.current.value = ''; return;
    }
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      const res = await api.restore(Array.isArray(data) ? data : data.trades);
      notify(`Restored ${res.restored} trade(s)`);
      onChanged();
    } catch (err) { notify('Restore failed: ' + err.message); }
    finally { setBusy(false); if (jsonRef.current) jsonRef.current.value = ''; }
  }

  async function syncTradovate() {
    setSyncing(true);
    try {
      const r = await api.tvSync(syncDate);
      let msg = `Synced ${r.date}: ${r.created} new trade(s), ${r.skipped} already imported`;
      if (r.openContractsSkipped) msg += `, ${r.openContractsSkipped} contract(s) still open (skipped)`;
      notify(msg);
      onChanged();
    } catch (err) { notify('Sync failed: ' + err.message); }
    finally { setSyncing(false); }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3>Tradovate sync</h3>
        <p className="hint">Pull the day's executed trades from Tradovate and add them as round-trip journal entries. Re-running is safe: already-imported trades are skipped.</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field">
            <label>Date to import</label>
            <input type="date" value={syncDate} onChange={(e) => setSyncDate(e.target.value)} />
          </div>
          <button className="btn" onClick={syncTradovate} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync from Tradovate'}</button>
          <button className="btn ghost" onClick={() => setTvOpen(true)}>Settings</button>
        </div>
      </div>

      <div className="card">
        <h3>Export</h3>
        <p className="hint">Download all {trades.length} trade(s) as a spreadsheet-ready CSV file.</p>
        <button className="btn" onClick={() => download('/api/export/csv')}>Export CSV</button>
      </div>
      <div className="card">
        <h3>Import CSV</h3>
        <p className="hint">Append trades from a CSV. Recognised columns: date, time, symbol, direction, entry, exit, exits (e.g. "2@29550; 1@29600"), contracts, stopLoss, takeProfit, commissions, setup, session, notes. Tradovate Performance exports (buyPrice/sellPrice/qty…) are detected and mapped automatically.</p>
        <input ref={csvRef} type="file" accept=".csv,text/csv" onChange={importCsv} disabled={busy} />
      </div>
      <div className="card">
        <h3>Backup (full)</h3>
        <p className="hint">Download a complete JSON backup (all fields + screenshot references). Keep it somewhere safe.</p>
        <button className="btn" onClick={() => download('/api/backup')}>Download backup</button>
      </div>
      <div className="card">
        <h3>Restore</h3>
        <p className="hint">Replace all data from a JSON backup file. Current data is safety-backed-up on the server first.</p>
        <input ref={jsonRef} type="file" accept=".json,application/json" onChange={restore} disabled={busy} />
      </div>

      {tvOpen && <TradovateSettings onClose={() => setTvOpen(false)} notify={notify} />}

      <div style={{ gridColumn: '1 / -1', marginTop: 20 }}>
        <PropFirmsView propfirms={propfirms} onUpdate={loadPropfirms} notify={notify} />
      </div>
    </div>
  );
}
