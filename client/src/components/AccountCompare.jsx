import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { computeStats, equitySeries, accountTypesPresent, fmtUSD, fmtNum, pnlClass } from '../helpers.js';

function MiniCurve({ eq }) {
  if (!eq.length) return <div className="hint">No closed trades.</div>;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={eq} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#262d3a" strokeDasharray="3 3" />
        <XAxis dataKey="i" stroke="#8b98a9" tick={{ fontSize: 10 }} />
        <YAxis stroke="#8b98a9" tick={{ fontSize: 10 }} width={58} tickFormatter={(v) => '$' + v.toLocaleString()} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #262d3a', borderRadius: 8, color: '#e6edf3' }}
          formatter={(v) => [fmtUSD(v), 'Equity']} labelFormatter={(l) => 'Trade #' + l}
        />
        <ReferenceLine y={0} stroke="#8b98a9" />
        <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Side-by-side equity curves + key stats per account type, to spot whether
// e.g. eval trades behave systematically different from live-funded ones.
export default function AccountCompare({ trades }) {
  const types = accountTypesPresent(trades);
  const groups = types.length ? types : ['Untagged'];
  const byType = groups.map((type) => {
    const arr = type === 'Untagged' ? trades.filter((t) => !t.accountType) : trades.filter((t) => t.accountType === type);
    return { type, trades: arr, stats: computeStats(arr), eq: equitySeries(arr) };
  });

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
      {byType.map(({ type, stats, eq }) => (
        <div className="card" key={type}>
          <h3>{type}</h3>
          <div className="acct-stats">
            <div><span>Trades</span><b>{stats.count}</b></div>
            <div><span>Win rate</span><b>{fmtNum(stats.winRate, 1)}%</b></div>
            <div><span>P&L</span><b className={pnlClass(stats.totalPnl)}>{fmtUSD(stats.totalPnl)}</b></div>
            <div><span>Expectancy</span><b className={pnlClass(stats.expectancy)}>{fmtUSD(stats.expectancy)}</b></div>
            <div><span>Profit factor</span><b>{stats.profitFactor === Infinity ? '∞' : fmtNum(stats.profitFactor, 2)}</b></div>
            <div><span>Avg R</span><b className={pnlClass(stats.avgR)}>{stats.avgR == null ? '-' : fmtNum(stats.avgR, 2)}</b></div>
          </div>
          <MiniCurve eq={eq} />
        </div>
      ))}
    </div>
  );
}
