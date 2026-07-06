import React from 'react';
import { groupStats, fmtUSD, fmtNum, pnlClass, mistakeTagStats } from '../helpers.js';

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
              <th className="num">Avg $ / trade</th>
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
                <td className={'num ' + pnlClass(r.expectancy)}>{fmtUSD(r.expectancy)}</td>
                <td className={'num ' + pnlClass(r.avgR)}>{r.avgR == null ? '-' : fmtNum(r.avgR, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Plain-language callouts for the groups that cost or make the most money,
// so the pattern jumps out without having to read the whole table.
function Insights({ emotionRows, mistakeRows }) {
  const costly = [...emotionRows, ...mistakeRows]
    .filter((r) => r.count >= 2 && r.expectancy < 0)
    .sort((a, b) => a.expectancy - b.expectancy)
    .slice(0, 3);
  const profitable = [...emotionRows]
    .filter((r) => r.count >= 2 && r.expectancy > 0)
    .sort((a, b) => b.expectancy - a.expectancy)
    .slice(0, 2);

  if (!costly.length && !profitable.length) return null;

  return (
    <div className="grid" style={{ marginBottom: 24, gap: 10 }}>
      {costly.map((r) => (
        <div key={'c' + r.key} className="card insight bad">
          You lose an average of <b>{fmtUSD(Math.abs(r.expectancy))}</b> per trade with <b>{r.key}</b> ({r.count} trades, {fmtNum(r.winRate, 0)}% win).
        </div>
      ))}
      {profitable.map((r) => (
        <div key={'p' + r.key} className="card insight good">
          You are most profitable with <b>{r.key}</b>: averaging <b>{fmtUSD(r.expectancy)}</b> per trade ({r.count} trades, {fmtNum(r.winRate, 0)}% win).
        </div>
      ))}
    </div>
  );
}

export default function PsychologyView({ trades }) {
  if (!trades.length) return <div className="empty-state">No trades match the current filters.</div>;

  const entryRows = groupStats(trades, (t) => t.emotionEntry || 'Untagged');
  const exitRows = groupStats(trades, (t) => t.emotionExit || 'Untagged');
  const mistakeRows = groupStats(trades, (t) => t.mistake || 'None').filter((r) => r.key !== 'None');
  const allMistakeRows = groupStats(trades, (t) => t.mistake || 'None');
  const gradeRows = groupStats(trades, (t) => t.grade || 'Ungraded').sort((a, b) => a.key.localeCompare(b.key));
  const ratingRows = groupStats(trades, (t) => t.rating || 'Unrated');
  const mistakeTagRows = mistakeTagStats(trades);

  return (
    <div>
      <Insights
        emotionRows={entryRows.filter((r) => r.key !== 'Untagged')}
        mistakeRows={[...mistakeRows, ...gradeRows.filter((r) => r.key !== 'Ungraded')]}
      />
      <Table title="By emotion at entry" rows={entryRows} />
      <Table title="By emotion at exit" rows={exitRows} />
      <Table title="By mental mistake" rows={allMistakeRows} />
      <Table title="By mistake tag" rows={mistakeTagRows} />
      <Table title="By grade" rows={gradeRows} />
      <Table title="By rating" rows={ratingRows} />
    </div>
  );
}
