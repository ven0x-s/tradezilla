import React from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { groupStats, fmtUSD, fmtNum, pnlClass, WEEKDAYS, weekdayOf, hourOf } from '../helpers.js';

function Table({ title, rows }) {
  if (!rows.length) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div className="section-title">{title}</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{title.replace('By ', '')}</th>
              <th className="num">Trades</th>
              <th className="num">Win %</th>
              <th className="num">P&L</th>
              <th className="num">Profit factor</th>
              <th className="num">Avg R</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td><span className="tag">{r.key}</span></td>
                <td className="num">{r.count}</td>
                <td className="num">{fmtNum(r.winRate, 1)}%</td>
                <td className={'num ' + pnlClass(r.totalPnl)}>{fmtUSD(r.totalPnl)}</td>
                <td className="num">{r.profitFactor === Infinity ? '∞' : fmtNum(r.profitFactor, 2)}</td>
                <td className={'num ' + pnlClass(r.avgR)}>{r.avgR == null ? '-' : fmtNum(r.avgR, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HoldingTimeChart({ trades }) {
  const points = trades
    .filter((t) => t.holdingMinutes != null && t.resultDollars != null)
    .map((t) => ({ x: t.holdingMinutes, y: t.resultDollars }));

  if (!points.length) {
    return (
      <div className="card hint">
        No holding-time data yet - fill in both entry and exit time on a trade to see this chart.
      </div>
    );
  }

  return (
    <div className="card">
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="#262d3a" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Holding time" unit="m" stroke="#8b98a9" tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name="Result" stroke="#8b98a9" tick={{ fontSize: 11 }} tickFormatter={(v) => '$' + v} width={70} />
          <ZAxis range={[70, 70]} />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #262d3a', borderRadius: 8, color: '#e6edf3' }}
            formatter={(v, name) => (name === 'x' ? [v + ' min', 'Holding time'] : [fmtUSD(v), 'Result'])}
            cursor={{ strokeDasharray: '3 3', stroke: '#8b98a9' }}
          />
          <Scatter data={points}>
            {points.map((p, i) => <Cell key={i} fill={p.y >= 0 ? '#22c55e' : '#ef4444'} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalysisView({ trades, playbooks = [] }) {
  if (!trades.length) return <div className="empty-state">No trades match the current filters.</div>;

  const pbName = (id) => (playbooks.find((p) => p.id === id) || {}).name;

  const weekdayRows = groupStats(trades, (t) => weekdayOf(t.date))
    .filter((r) => r.key !== 'Unspecified')
    .sort((a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key));
  const hourRows = groupStats(trades, (t) => {
    const h = hourOf(t.time);
    return h == null ? null : String(h).padStart(2, '0') + ':00';
  }).filter((r) => r.key !== 'Unspecified').sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div>
      <Table title="By symbol" rows={groupStats(trades, (t) => t.symbol)} />
      <Table title="By setup" rows={groupStats(trades, (t) => t.setup)} />
      <Table title="By model" rows={groupStats(trades, (t) => t.model)} />
      <Table title="By entry model" rows={groupStats(trades, (t) => t.entryModel)} />
      <Table title="By news event" rows={groupStats(trades, (t) => t.newsEvent || 'No news')} />
      <Table title="By session" rows={groupStats(trades, (t) => t.session)} />
      <Table title="By emotion" rows={groupStats(trades, (t) => t.emotion)} />
      <Table title="By direction" rows={groupStats(trades, (t) => (t.direction === 'short' ? 'Short' : 'Long'))} />
      <Table title="By account type" rows={groupStats(trades, (t) => t.accountType)} />
      <Table title="By playbook" rows={groupStats(trades, (t) => pbName(t.playbookId))} />
      <Table title="By prop firm" rows={groupStats(trades, (t) => t.propFirm)} />

      <div className="section-title">Holding time vs profitability</div>
      <HoldingTimeChart trades={trades} />

      <div style={{ marginTop: 24 }} />
      <Table title="Best/worst days of the week" rows={weekdayRows} />
      <Table title="Best/worst hours of the day" rows={hourRows} />
    </div>
  );
}
