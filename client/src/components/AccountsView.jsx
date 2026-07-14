import React, { useMemo } from 'react';
import { computeStats, equitySeries } from '../helpers.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AccountsView({ trades = [], propfirms = [] }) {
  const accountPerformance = useMemo(() => {
    const perf = {};
    for (const f of propfirms) {
      for (const a of (f.accounts || [])) {
        const accountTrades = trades.filter((t) => t.accountId === a.id);
        const stats = computeStats(accountTrades);
        const eq = equitySeries(accountTrades);
        perf[a.id] = {
          firmName: f.name,
          accountType: a.type,
          accountName: a.name,
          startingBalance: a.balance,
          ...stats,
          equity: eq,
          tradeCount: accountTrades.length,
        };
      }
    }
    return perf;
  }, [trades, propfirms]);

  const withTrades = Object.entries(accountPerformance)
    .filter(([_, p]) => p.tradeCount > 0)
    .sort(([_, a], [__, b]) => (b.totalPnl || 0) - (a.totalPnl || 0));

  if (withTrades.length === 0) {
    return (
      <div>
        <h2>Account performance</h2>
        <div className="hint">No trades linked to accounts yet. Create trades and select an account to start tracking per-account performance.</div>
      </div>
    );
  }

  return (
    <div>
      <h2>Account performance</h2>

      <div style={{ display: 'grid', gap: 24 }}>
        {withTrades.map(([accId, perf]) => (
          <div key={accId} className="card">
            <h3>{perf.firmName} — {perf.accountType} ({perf.accountName})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              <div>
                <div className="hint">Starting balance</div>
                <b>${perf.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>
              </div>
              <div>
                <div className="hint">Current balance</div>
                <b className={perf.totalPnl > 0 ? 'pos' : perf.totalPnl < 0 ? 'neg' : ''}>
                  ${(perf.startingBalance + (perf.totalPnl || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </b>
              </div>
              <div>
                <div className="hint">Total P&L</div>
                <b className={perf.totalPnl > 0 ? 'pos' : perf.totalPnl < 0 ? 'neg' : ''}>
                  ${(perf.totalPnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </b>
              </div>
              <div>
                <div className="hint">Trades</div>
                <b>{perf.tradeCount}</b>
              </div>
              <div>
                <div className="hint">Win rate</div>
                <b>{perf.winRate ?? 0}%</b>
              </div>
              <div>
                <div className="hint">Avg R</div>
                <b>{(perf.avgR || 0).toFixed(2)}</b>
              </div>
            </div>

            {perf.equity && perf.equity.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginTop: 0 }}>Equity curve</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={perf.equity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="i" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="equity" stroke="#3b82f6" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
