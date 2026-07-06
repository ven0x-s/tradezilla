import React, { useState } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { computeStats, equitySeries, maxDrawdown, groupStats, accountTypesPresent, fmtUSD, fmtNum, pnlClass } from '../helpers.js';
import SetupPerformance from './SetupPerformance.jsx';
import AccountCompare from './AccountCompare.jsx';

function Stat({ label, value, sub, cls }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className={'value ' + (cls || '')}>{value}</div>
      {sub != null && <div className="sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ trades }) {
  const [acctMode, setAcctMode] = useState('all');
  const present = accountTypesPresent(trades);

  if (!trades.length) {
    return <div className="empty-state">No trades match the current filters. Add a trade to get started.</div>;
  }

  const view = (acctMode === 'all' || acctMode === 'compare')
    ? trades
    : trades.filter((t) => t.accountType === acctMode);
  const s = computeStats(view);
  const eq = equitySeries(view);
  const pf = s.profitFactor === Infinity ? '∞' : fmtNum(s.profitFactor, 2);
  const maxDd = maxDrawdown(eq);
  const po3Rows = groupStats(view, (t) => t.po3);

  return (
    <div>
      {present.length > 0 && (
        <div className="acct-toggle">
          <span className="hint" style={{ marginRight: 4 }}>Account:</span>
          <button className={acctMode === 'all' ? 'active' : ''} onClick={() => setAcctMode('all')}>All combined</button>
          {present.map((a) => (
            <button key={a} className={acctMode === a ? 'active' : ''} onClick={() => setAcctMode(a)}>{a}</button>
          ))}
          <button className={acctMode === 'compare' ? 'active' : ''} onClick={() => setAcctMode('compare')}>Compare side by side</button>
        </div>
      )}

      {acctMode === 'compare' && (
        <>
          <div className="section-title">Account comparison</div>
          <AccountCompare trades={trades} />
          <div style={{ marginTop: 8 }} />
        </>
      )}

      <div className="grid stat-grid">
        <Stat label="Total P&L" value={fmtUSD(s.totalPnl)} cls={pnlClass(s.totalPnl)} sub={`${s.count} trades`} />
        <Stat label="Win rate" value={fmtNum(s.winRate, 1) + '%'} sub={`${s.winCount}W / ${s.lossCount}L`} />
        <Stat label="Profit factor" value={pf} />
        <Stat label="Expectancy / trade" value={fmtUSD(s.expectancy)} cls={pnlClass(s.expectancy)} sub={s.avgR != null ? `avg ${fmtNum(s.avgR, 2)}R` : null} />
        <Stat label="Avg win" value={fmtUSD(s.avgWin)} cls="pos" />
        <Stat label="Avg loss" value={fmtUSD(s.avgLoss)} cls="neg" />
        <Stat label="Largest win" value={fmtUSD(s.largestWin)} cls="pos" />
        <Stat label="Largest loss" value={fmtUSD(s.largestLoss)} cls="neg" />
        <Stat label="Max drawdown" value={fmtUSD(maxDd)} cls={maxDd < 0 ? 'neg' : ''} />
      </div>

      <div className="section-title">Equity curve</div>
      <div className="card">
        {eq.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={eq} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#262d3a" strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke="#8b98a9" tick={{ fontSize: 11 }} />
              <YAxis stroke="#8b98a9" tick={{ fontSize: 11 }} tickFormatter={(v) => '$' + v.toLocaleString()} width={70} />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #262d3a', borderRadius: 8, color: '#e6edf3' }}
                formatter={(v) => [fmtUSD(v), 'Equity']}
                labelFormatter={(l) => 'Trade #' + l}
              />
              <ReferenceLine y={0} stroke="#8b98a9" />
              <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="hint">No closed trades yet.</div>}
      </div>

      {eq.length > 0 && (
        <>
          <div className="section-title">Drawdown</div>
          <div className="card">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={eq} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#262d3a" strokeDasharray="3 3" />
                <XAxis dataKey="i" stroke="#8b98a9" tick={{ fontSize: 11 }} />
                <YAxis stroke="#8b98a9" tick={{ fontSize: 11 }} tickFormatter={(v) => '$' + v.toLocaleString()} width={70} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #262d3a', borderRadius: 8, color: '#e6edf3' }}
                  formatter={(v) => [fmtUSD(v), 'Drawdown']}
                  labelFormatter={(l) => 'Trade #' + l}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="rgba(239,68,68,0.25)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="section-title">Setup performance</div>
      <SetupPerformance trades={view} />

      {po3Rows.length > 0 && (
        <>
          <div className="section-title">PO3 phase</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Phase</th><th className="num">Trades</th><th className="num">Win %</th><th className="num">P&L</th><th className="num">Avg R</th></tr>
              </thead>
              <tbody>
                {po3Rows.map((r) => (
                  <tr key={r.key}>
                    <td><span className="tag">{r.key}</span></td>
                    <td className="num">{r.count}</td>
                    <td className="num">{fmtNum(r.winRate, 1)}%</td>
                    <td className={'num ' + pnlClass(r.totalPnl)}>{fmtUSD(r.totalPnl)}</td>
                    <td className={'num ' + pnlClass(r.avgR)}>{r.avgR == null ? '-' : fmtNum(r.avgR, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
