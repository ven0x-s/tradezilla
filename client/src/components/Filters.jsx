import React from 'react';
import { SESSIONS } from '../helpers.js';

const EMPTY_FILTERS = { symbol: '', setup: '', model: '', entryModel: '', htfDelivery: '', newsEvent: '', session: '', direction: '', from: '', to: '' };

export default function Filters({ trades, filters, setFilters }) {
  const symbols = Array.from(new Set(trades.map((t) => t.symbol).filter(Boolean))).sort();
  const setups = Array.from(new Set(trades.map((t) => t.setup).filter(Boolean))).sort();
  const models = Array.from(new Set(trades.map((t) => t.model).filter(Boolean))).sort();
  const entryModels = Array.from(new Set(trades.map((t) => t.entryModel).filter(Boolean))).sort();
  const htfDeliveries = Array.from(new Set(trades.map((t) => t.htfDelivery).filter(Boolean))).sort();
  const newsEvents = Array.from(new Set(trades.map((t) => t.newsEvent).filter(Boolean))).sort();
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const active = Object.keys(EMPTY_FILTERS).some((k) => filters[k]);

  return (
    <div className="filters">
      <div className="field">
        <label>Symbol</label>
        <select value={filters.symbol} onChange={(e) => set('symbol', e.target.value)}>
          <option value="">All</option>
          {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Setup</label>
        <select value={filters.setup} onChange={(e) => set('setup', e.target.value)}>
          <option value="">All</option>
          {setups.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Model</label>
        <select value={filters.model} onChange={(e) => set('model', e.target.value)}>
          <option value="">All</option>
          {models.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Entry model</label>
        <select value={filters.entryModel} onChange={(e) => set('entryModel', e.target.value)}>
          <option value="">All</option>
          {entryModels.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>HTF delivery</label>
        <select value={filters.htfDelivery} onChange={(e) => set('htfDelivery', e.target.value)}>
          <option value="">All</option>
          {htfDeliveries.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>News</label>
        <select value={filters.newsEvent} onChange={(e) => set('newsEvent', e.target.value)}>
          <option value="">All</option>
          {newsEvents.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Session</label>
        <select value={filters.session} onChange={(e) => set('session', e.target.value)}>
          <option value="">All</option>
          {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Direction</label>
        <select value={filters.direction} onChange={(e) => set('direction', e.target.value)}>
          <option value="">All</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>
      <div className="field">
        <label>From</label>
        <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
      </div>
      <div className="field">
        <label>To</label>
        <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
      </div>
      {active ? <button className="btn ghost" onClick={() => setFilters(EMPTY_FILTERS)}>Clear</button> : null}
    </div>
  );
}
