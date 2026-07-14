import React, { useEffect, useRef, useState } from 'react';
import { fmtUSD, fmtNum } from '../helpers.js';
import { wrapLines, loadImage, roundRect, drawQr } from './ShareCard.jsx';

const W = 1200;

const BIAS_COLORS = { Bullish: '#22c55e', Bearish: '#ef4444', Neutral: '#8b98a9' };

function drawPill(ctx, text, x, y, color) {
  ctx.font = '700 18px Arial';
  const w = ctx.measureText(text).width + 30;
  ctx.fillStyle = color + '33';
  roundRect(ctx, x, y, w, 34, 17);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, x + 15, y + 24);
  return w;
}

// Wrapped text block with a small grey label; returns the new cursor y.
function drawSection(ctx, label, text, x, y, maxWidth, maxLines) {
  let lines = wrapLines(ctx, text, maxWidth);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…');
  }
  ctx.font = '13px Arial';
  ctx.fillStyle = '#8b98a9';
  ctx.fillText(label, x, y);
  ctx.font = '16px Arial';
  ctx.fillStyle = '#c9d3e0';
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + 28 + i * 24));
  return y + 28 + lines.length * 24 + 26;
}

function dayStats(entry, trades) {
  const closed = (trades || []).filter((t) => t.date === entry.date && t.resultDollars != null);
  return {
    count: closed.length,
    pnl: closed.reduce((s, t) => s + t.resultDollars, 0),
    points: closed.reduce((s, t) => s + (t.resultPoints || 0), 0),
  };
}

async function draw(canvas, entry, trades, o) {
  const ctx = canvas.getContext('2d');
  const shot = (entry.screenshots || [])[0];
  const hasImage = !!shot && o.screenshot;
  const leftW = hasImage ? 680 : W;
  const stats = dayStats(entry, trades);
  const showPnl = o.dayPnl && entry.traded && stats.count > 0;

  // Pre-measure text sections so the canvas height fits the content.
  ctx.font = '16px Arial';
  const measure = (text, maxLines) => {
    if (!text || !String(text).trim()) return 0;
    return 28 + Math.min(wrapLines(ctx, text, leftW - 80).length, maxLines) * 24 + 26;
  };
  let contentH = 210;
  if (showPnl) contentH += 130;
  if (o.observations) contentH += measure(entry.observations, 10);
  if (o.reason) contentH += measure(entry.reason, 6);
  const H = Math.max(500, contentH + 70);

  canvas.width = W; canvas.height = H;

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0e1117');
  bg.addColorStop(1, '#161b22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glowColor = entry.bias === 'Bearish' ? 'rgba(239,68,68,0.14)'
    : entry.bias === 'Bullish' ? 'rgba(34,197,94,0.14)' : 'rgba(59,130,246,0.12)';
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 500);
  glow.addColorStop(0, glowColor);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // logo + wordmark
  if (o.brand) {
    const logo = await loadImage('/pugzilla-logo.jpg');
    if (logo) {
      roundRect(ctx, 40, 28, 64, 64, 15);
      ctx.save(); ctx.clip();
      ctx.drawImage(logo, 40, 28, 64, 64);
      ctx.restore();
    }
    ctx.fillStyle = '#e6edf3';
    ctx.font = '700 27px Arial';
    ctx.fillText('Pugzilla', 118, 60);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('zilla', 118 + ctx.measureText('Pug').width, 60);
    ctx.fillStyle = '#8b98a9';
    ctx.font = '14px Arial';
    ctx.fillText('Market journal', 118, 82);
  }

  // subtle QR to the project repo, top-right
  if (o.qr) drawQr(ctx, leftW - 40 - 60, 32, 60);

  // date headline + weekday
  const d = new Date((entry.date || '') + 'T00:00:00');
  const weekday = isNaN(d) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
  ctx.font = '700 44px Arial';
  ctx.fillStyle = '#e6edf3';
  ctx.fillText(entry.date || '', 40, 158);
  const dateW = ctx.measureText(entry.date || '').width;
  if (weekday) {
    ctx.font = '20px Arial';
    ctx.fillStyle = '#8b98a9';
    ctx.fillText(weekday, 44 + dateW + 16, 158);
  }

  // bias + traded pills
  let px = 40;
  if (o.bias && entry.bias) {
    px += drawPill(ctx, entry.bias.toUpperCase(), px, 176, BIAS_COLORS[entry.bias] || '#8b98a9') + 10;
  }
  if (o.traded) {
    drawPill(ctx, entry.traded ? 'TRADED' : 'NO TRADES', px, 176, entry.traded ? '#3b82f6' : '#8b98a9');
  }

  let y = 250;

  // day P&L from linked trades
  if (showPnl) {
    ctx.font = '13px Arial';
    ctx.fillStyle = '#8b98a9';
    ctx.fillText('DAY P&L', 40, y);
    ctx.font = '700 56px Arial';
    ctx.fillStyle = stats.pnl > 0 ? '#22c55e' : stats.pnl < 0 ? '#ef4444' : '#e6edf3';
    ctx.fillText(fmtUSD(stats.pnl), 40, y + 58);
    ctx.font = '600 18px Arial';
    ctx.fillStyle = '#8b98a9';
    ctx.fillText(`${stats.count} trade${stats.count === 1 ? '' : 's'}   ·   ${stats.points > 0 ? '+' : ''}${fmtNum(stats.points, 2)} pts`, 40, y + 92);
    y += 130;
  }

  if (o.observations && entry.observations && String(entry.observations).trim()) {
    y = drawSection(ctx, 'WHAT I SAW', entry.observations, 40, y, leftW - 80, 10);
  }
  if (o.reason && entry.reason && String(entry.reason).trim()) {
    y = drawSection(ctx, "WHY I DID / DIDN'T TRADE", entry.reason, 40, y, leftW - 80, 6);
  }

  // footer
  if (o.footer) {
    ctx.font = '13px Arial';
    ctx.fillStyle = '#5b6577';
    ctx.textAlign = 'right';
    ctx.fillText('pugzilla journal', leftW - 40, H - 36);
    ctx.textAlign = 'left';
  }

  // screenshot panel
  if (hasImage) {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(leftW, 30); ctx.lineTo(leftW, H - 30); ctx.stroke();
    const img = await loadImage('/uploads/' + shot.filename);
    const panelX = leftW + 30, panelY = 30, panelW = W - leftW - 60, panelH = H - 60;
    roundRect(ctx, panelX, panelY, panelW, panelH, 14);
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#0a0d12';
    ctx.fill();
    if (img) {
      const scale = Math.max(panelW / img.width, panelH / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      ctx.drawImage(img, panelX + (panelW - iw) / 2, panelY + (panelH - ih) / 2, iw, ih);
    }
    ctx.restore();
  }
}

const DEFAULT_OPTS = {
  brand: true, bias: true, traded: true, dayPnl: true, observations: true,
  reason: true, footer: true, screenshot: true, qr: true,
};
const TOGGLES = [
  ['bias', 'Bias'], ['traded', 'Traded'], ['dayPnl', 'Day P&L'], ['observations', 'What I saw'],
  ['reason', 'Why'], ['screenshot', 'Screenshot'], ['brand', 'Logo'], ['footer', 'Footer'], ['qr', 'QR'],
];

export default function JournalShareCard({ entry, trades = [], onClose }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const tog = (k) => setOpts((o) => ({ ...o, [k]: !o[k] }));

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      await draw(canvasRef.current, entry, trades, opts);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [entry, trades, opts]);

  function download() {
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `pugzilla-journal-${entry.date || 'day'}.png`;
    a.click();
  }

  async function copyImage() {
    try {
      canvasRef.current.toBlob(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopyMsg('Copied!');
        setTimeout(() => setCopyMsg(''), 1800);
      });
    } catch {
      setCopyMsg('Copy not supported in this browser');
      setTimeout(() => setCopyMsg(''), 2200);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760 }}>
        <div className="modal-head">
          <h2>Share market note</h2>
          <button className="close-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 10, fontSize: 12 }}>
            {TOGGLES.map(([k, label]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <input type="checkbox" checked={opts[k]} onChange={() => tog(k)} /> {label}
              </label>
            ))}
          </div>
          <canvas ref={canvasRef} className="share-canvas" style={{ opacity: ready ? 1 : 0.3 }} />
          {!ready && <div className="hint" style={{ marginTop: 8 }}>Rendering card…</div>}
        </div>
        <div className="modal-foot">
          <span className="hint">{copyMsg || 'PNG, ready for Twitter/X or Discord'}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={copyImage} disabled={!ready}>Copy image</button>
            <button className="btn" onClick={download} disabled={!ready}>Download PNG</button>
          </div>
        </div>
      </div>
    </div>
  );
}
