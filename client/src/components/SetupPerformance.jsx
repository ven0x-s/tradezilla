import React, { useState, useMemo } from 'react';
import { setupTagStats, fmtUSD, fmtNum, pnlClass } from '../helpers.js';

const COLS = [
  ['key', 'Setup tag', false],
  ['count', 'Trades', true],
  ['winRate', 'Win %', true],
  ['profitFactor', 'Profit factor', true],
  ['avgR', 'Avg R', true],
  ['totalPnl', 'Total P&L', true],
];

export default function SetupPerformance({ trades }) {
  const rows = useMemo(() => setupTagStats(trades), [trades]);
  const [sortKey, setSortKey] = useState('totalPnl');
  const [dir, setDir] = useState('desc');

  const sorted = useMemo(() => {
    const arr = rows.slice();
    arr.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'key') return dir === 'asc' ? String(av).localeCompare(bv) : String(bv).localeCompare(av);
      av = av ?? -Infinity; bv = bv ?? -Infinity;
      if (av === Infinity) av = Number.MAX_VALUE; if (bv === Infinity) bv = Number.MAX_VALUE;
      return dir === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [rows, sortKey, dir]);

  function sortBy(k) {
    if (k === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setDir('desc'); }
  }

  if (!rows.length) {
    return <div className="card hint">No setup tags yet — add ICT setup tags to trades to see performance per setup.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLS.map(([k, label, num]) => (
              <th key={k} className={num ? 'num' : ''} onClick={() => sortBy(k)}>
                {label}{sortKey === k ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.key}>
              <td><span className="tag">{r.key}</span></td>
              <td className="num">{r.count}</td>
              <td className="num">{fmtNum(r.winRate, 1)}%</td>
              <td className="num">{r.profitFactor === Infinity ? '∞' : fmtNum(r.profitFactor, 2)}</td>
              <td className={'num ' + pnlClass(r.avgR)}>{r.avgR == null ? '-' : fmtNum(r.avgR, 2)}</td>
              <td className={'num ' + pnlClass(r.totalPnl)}>{fmtUSD(r.totalPnl)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
