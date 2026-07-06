import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from './api.js';
import Filters from './components/Filters.jsx';
import Dashboard from './components/Dashboard.jsx';
import TradesView from './components/TradesView.jsx';
import TradeForm from './components/TradeForm.jsx';
import CalendarView from './components/CalendarView.jsx';
import AnalysisView from './components/AnalysisView.jsx';
import DataView from './components/DataView.jsx';
import Login from './components/Login.jsx';
import ShareCard from './components/ShareCard.jsx';
import PsychologyView from './components/PsychologyView.jsx';

const TABS = [
  ['dashboard', 'Dashboard'],
  ['trades', 'Trades'],
  ['calendar', 'Calendar'],
  ['analysis', 'Analysis'],
  ['psychology', 'Psychology'],
  ['data', 'Data'],
];

const emptyFilters = { symbol: '', setup: '', model: '', entryModel: '', htfDelivery: '', newsEvent: '', grade: '', session: '', direction: '', from: '', to: '' };

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [needsRegister, setNeedsRegister] = useState(false);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [filters, setFilters] = useState(emptyFilters);
  const [editing, setEditing] = useState(null); // trade object or {} for new
  const [sharing, setSharing] = useState(null); // trade object being shared
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const status = await api.authStatus();
        if (!status.hasUsers) {
          setNeedsRegister(true);
          return;
        }
        const me = await api.me();
        setUser(me);
      } catch {
        // not logged in; the login screen will be shown
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const t = await api.listTrades();
      setTrades(t);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  function onAuthed(u) {
    setUser(u);
    setNeedsRegister(false);
  }

  async function logout() {
    await api.logout();
    setUser(null);
    setTrades([]);
    setLoading(true);
  }

  const filtered = useMemo(() => trades.filter((t) => {
    if (filters.symbol && t.symbol !== filters.symbol) return false;
    if (filters.setup && t.setup !== filters.setup) return false;
    if (filters.model && t.model !== filters.model) return false;
    if (filters.entryModel && t.entryModel !== filters.entryModel) return false;
    if (filters.htfDelivery && t.htfDelivery !== filters.htfDelivery) return false;
    if (filters.newsEvent && t.newsEvent !== filters.newsEvent) return false;
    if (filters.grade && t.grade !== filters.grade) return false;
    if (filters.session && t.session !== filters.session) return false;
    if (filters.direction && t.direction !== filters.direction) return false;
    if (filters.from && (t.date || '') < filters.from) return false;
    if (filters.to && (t.date || '') > filters.to) return false;
    return true;
  }), [trades, filters]);

  async function del(t) {
    if (!confirm(`Delete this ${t.symbol} trade from ${t.date}?`)) return;
    try {
      await api.deleteTrade(t.id);
      notify('Trade deleted');
      load();
    } catch (e) { notify('Delete failed: ' + e.message); }
  }

  const showFilters = tab !== 'data';

  if (!authChecked) return <div className="empty-state">Loading…</div>;
  if (!user) return <Login mode={needsRegister ? 'register' : 'login'} onAuthed={onAuthed} />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><img src="/pugzilla-logo.jpg" alt="Pugzilla" className="brand-logo" /> Pug<span className="z">zilla</span> <span className="full muted" style={{ fontWeight: 400, fontSize: 13 }}>Journal</span></div>
        <nav className="nav">
          {TABS.map(([k, label]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
        <div className="spacer" />
        <button className="btn" onClick={() => setEditing({})}>+ New trade</button>
        <button className="btn ghost" onClick={logout} title="Uitloggen">{user.username} · Uitloggen</button>
      </header>

      <main className="content">
        {error && <div className="card" style={{ borderColor: 'var(--neg)', marginBottom: 16 }}>
          Could not reach the server: {error}. Make sure the backend is running.
        </div>}
        {loading ? <div className="empty-state">Loading…</div> : (
          <>
            {showFilters && <Filters trades={trades} filters={filters} setFilters={setFilters} />}
            {tab === 'dashboard' && <Dashboard trades={filtered} />}
            {tab === 'trades' && <TradesView trades={filtered} onEdit={setEditing} onDelete={del} onShare={setSharing} />}
            {tab === 'calendar' && <CalendarView trades={filtered} />}
            {tab === 'analysis' && <AnalysisView trades={filtered} />}
            {tab === 'psychology' && <PsychologyView trades={filtered} />}
            {tab === 'data' && <DataView trades={trades} onChanged={load} notify={notify} />}
          </>
        )}
      </main>

      {editing && (
        <TradeForm
          trade={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => load()}
          notify={notify}
        />
      )}
      {sharing && <ShareCard trade={sharing} onClose={() => setSharing(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
