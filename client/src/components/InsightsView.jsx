import React from 'react';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { drawdownSeries, streaks, rHistogram, byHour, byWeekday, tiltFlags, disciplineSplit, fmtUSD, fmtNum, pnlClass } from '../helpers.js';

const GREEN = '#22c55e', RED = '#ef4444', BLUE = '#3b82f6', DIM = '#8b98a9', GRID = '#262d3a';
const tip = { background: '#161b22', border: '1px solid #262d3a', borderRadius: 8, color: '#e6edf3' };

function Card({ title, children, wide }) {
  return (
    <div className="card" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function InsightsView({ trades }) {
  if (!trades.length) return <div className="empty-state">No trades match the current filters.</div>;

  const { series: dd, maxDD } = drawdownSeries(trades);
  const st = streaks(trades);
  const rh = rHistogram(trades);
  const hours = byHour(trades).filter((h) => h.count > 0);
  const wds = byWeekday(trades);
  const tilt = tiltFlags(trades);
  const disc = disciplineSplit(trades);

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
      <div className="grid stat-grid" style={{ gridColumn: '1 / -1' }}>
        <div className="card stat"><div className="label">Max drawdown</div><div className="value neg">{fmtUSD(maxDD)}</div></div>
        <div className="card stat"><div className="label">Longest win streak</div><div className="value pos">{st.longestWin}</div></div>
        <div className="card stat"><div className="label">Longest loss streak</div><div className="value neg">{st.longestLoss}</div></div>
        <div className="card stat"><div className="label">Current streak</div><div className={'value ' + (st.current.type === 'win' ? 'pos' : st.current.type === 'loss' ? 'neg' : '')}>{st.current.len ? st.current.len + ' ' + st.current.type : '-'}</div></div>
      </div>

      <Card title="Drawdown" wide>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dd} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs><linearGradient id="ddg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RED} stopOpacity={0.5} /><stop offset="100%" stopColor={RED} stopOpacity={0.05} /></linearGradient></defs>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="i" stroke={DIM} tick={{ fontSize: 11 }} />
            <YAxis stroke={DIM} tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => '$' + v.toLocaleString()} />
            <Tooltip contentStyle={tip} formatter={(v) => [fmtUSD(v), 'Drawdown']} labelFormatter={(l) => 'Trade #' + l} />
            <Area type="monotone" dataKey="dd" stroke={RED} fill="url(#ddg)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card title="R-multiple distribution">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rh} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={DIM} tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
            <YAxis stroke={DIM} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tip} formatter={(v) => [v, 'Trades']} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {rh.map((b, i) => <Cell key={i} fill={b.label.includes('-') && !b.label.startsWith('0') ? RED : BLUE} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="P&L by weekday">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={wds} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke={DIM} tick={{ fontSize: 11 }} />
            <YAxis stroke={DIM} tick={{ fontSize: 11 }} width={64} tickFormatter={(v) => '$' + v} />
            <Tooltip contentStyle={tip} formatter={(v, n, p) => [fmtUSD(v) + ' (' + p.payload.count + ')', 'P&L']} />
            <ReferenceLine y={0} stroke={DIM} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{wds.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? GREEN : RED} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="P&L by hour">
        {hours.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="hour" stroke={DIM} tick={{ fontSize: 11 }} tickFormatter={(h) => h + 'h'} />
              <YAxis stroke={DIM} tick={{ fontSize: 11 }} width={64} tickFormatter={(v) => '$' + v} />
              <Tooltip contentStyle={tip} formatter={(v, n, p) => [fmtUSD(v) + ' (' + p.payload.count + ')', 'P&L']} labelFormatter={(h) => h + ':00'} />
              <ReferenceLine y={0} stroke={DIM} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{hours.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? GREEN : RED} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="hint">Add entry times to see hourly performance.</div>}
      </Card>

      <Card title="Discipline (plan followed vs broken)">
        <table style={{ width: '100%' }}>
          <thead><tr><th></th><th className="num">Trades</th><th className="num">Win %</th><th className="num">P&L</th><th className="num">Expectancy</th></tr></thead>
          <tbody>
            <tr><td><span className="pill long">Followed</span></td><td className="num">{disc.followedN}</td><td className="num">{fmtNum(disc.followed.winRate, 1)}%</td><td className={'num ' + pnlClass(disc.followed.totalPnl)}>{fmtUSD(disc.followed.totalPnl)}</td><td className={'num ' + pnlClass(disc.followed.expectancy)}>{fmtUSD(disc.followed.expectancy)}</td></tr>
            <tr><td><span className="pill short">Broken</span></td><td className="num">{disc.brokenN}</td><td className="num">{fmtNum(disc.broken.winRate, 1)}%</td><td className={'num ' + pnlClass(disc.broken.totalPnl)}>{fmtUSD(disc.broken.totalPnl)}</td><td className={'num ' + pnlClass(disc.broken.expectancy)}>{fmtUSD(disc.broken.expectancy)}</td></tr>
          </tbody>
        </table>
        <div className="hint" style={{ marginTop: 8 }}>Set "Plan followed" on your trades to compare.</div>
      </Card>

      <Card title="Tilt & overtrading alerts" wide>
        {tilt.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th className="num">Trades</th><th className="num">Day P&L</th><th>Flag</th></tr></thead>
              <tbody>
                {tilt.map((f) => (
                  <tr key={f.date}>
                    <td>{f.date}</td><td className="num">{f.count}</td>
                    <td className={'num ' + pnlClass(f.pnl)}>{fmtUSD(f.pnl)}</td>
                    <td>{f.reasons.map((r) => <span key={r} className="tag" style={{ marginRight: 6, borderColor: RED, color: RED }}>{r}</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="hint">No tilt or overtrading days detected. Nice discipline.</div>}
      </Card>
    </div>
  );
}
