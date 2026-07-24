import React, { useEffect, useRef, useState } from 'react';
import qrcode from 'qrcode-generator';
import { fmtUSD, fmtNum, fmtR, pnlClass } from '../helpers.js';

const W = 1200;
const REPO_URL = 'https://github.com/ven0x-s/pugzilla';

// Subtle light-on-dark QR linking to the project repo.
export function drawQr(ctx, x, y, size) {
  const qr = qrcode(0, 'L');
  qr.addData(REPO_URL);
  qr.make();
  const n = qr.getModuleCount();
  const cell = size / n;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#8b98a9';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(x + c * cell, y + r * cell, cell + 0.5, cell + 0.5);
    }
  }
  ctx.restore();
}

export function wrapLines(ctx, text, maxWidth) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function draw(canvas, t, o) {
  const ctx = canvas.getContext('2d');
  const shot = (t.screenshots || [])[0];
  const hasImage = !!shot && o.screenshot;
  const leftW = hasImage ? 680 : W;

  // Pre-measure notes so the canvas can grow and avoid truncation where it fits.
  const NOTES_FONT = '16px Arial', NOTES_LH = 24, NOTES_LABEL_Y = 512, MAX_NOTES_LINES = 8;
  let noteLines = [];
  if (o.notes && t.notes && String(t.notes).trim()) {
    ctx.font = NOTES_FONT;
    noteLines = wrapLines(ctx, t.notes, leftW - 80);
    if (noteLines.length > MAX_NOTES_LINES) {
      noteLines = noteLines.slice(0, MAX_NOTES_LINES);
      noteLines[MAX_NOTES_LINES - 1] = noteLines[MAX_NOTES_LINES - 1].replace(/.$/, '…');
    }
  }
  const notesTextTop = NOTES_LABEL_Y + 26;
  const H = noteLines.length ? Math.max(630, notesTextTop + noteLines.length * NOTES_LH + 44) : 630;

  canvas.width = W; canvas.height = H;

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0e1117');
  bg.addColorStop(1, '#161b22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const win = t.resultDollars > 0;
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 500);
  glow.addColorStop(0, win ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.16)');
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
    ctx.fillText('Pugzilla', 118, 70);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('zilla', 118 + ctx.measureText('Pug').width, 70);
  }

  if (o.date) {
    ctx.fillStyle = '#8b98a9';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${t.date || ''} ${t.time || ''}`.trim(), leftW - 40, 50);
    ctx.textAlign = 'left';
  }

  // subtle QR to the project repo, top-right under the date
  if (o.qr) drawQr(ctx, leftW - 40 - 60, o.date ? 62 : 32, 60);

  // symbol + direction pill
  if (o.symbol) {
    ctx.font = '700 44px Arial';
    ctx.fillStyle = '#e6edf3';
    ctx.fillText(t.symbol || '', 40, 150);
    const symW = ctx.measureText(t.symbol || '').width;
    ctx.font = '700 20px Arial';
    const dirText = (t.direction === 'short' ? 'SHORT' : 'LONG');
    const pillColor = t.direction === 'short' ? '#ef4444' : '#22c55e';
    const pillX = 40 + symW + 20;
    ctx.fillStyle = pillColor + '33';
    roundRect(ctx, pillX, 118, ctx.measureText(dirText).width + 32, 36, 18);
    ctx.fill();
    ctx.fillStyle = pillColor;
    ctx.fillText(dirText, pillX + 16, 143);
  }

  // entry / exit
  if (o.entryExit) {
    const partials = Array.isArray(t.exits) ? t.exits.filter((p) => p && p.qty && p.price != null) : [];
    ctx.font = '13px Arial';
    ctx.fillStyle = '#8b98a9';
    ctx.fillText('ENTRY', 40, 210);
    ctx.fillText(partials.length ? 'EXIT (AVG)' : 'EXIT', 220, 210);
    ctx.font = '700 30px Arial';
    ctx.fillStyle = '#e6edf3';
    ctx.fillText(fmtNum(t.entry, 2), 40, 245);
    ctx.fillText(fmtNum(t.exit, 2), 220, 245);
    if (partials.length) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#8b98a9';
      ctx.fillText(partials.map((p) => `${p.qty} @ ${fmtNum(p.price, 2)}`).join('  ·  '), 40, 272);
    }
  }

  // result (dollars or points)
  if (o.result) {
    const usePts = o.pnlPoints;
    const val = usePts ? t.resultPoints : t.resultDollars;
    ctx.font = '13px Arial';
    ctx.fillStyle = '#8b98a9';
    ctx.fillText(usePts ? 'RESULT (POINTS)' : 'RESULT', 40, 300);
    ctx.font = '700 72px Arial';
    ctx.fillStyle = val > 0 ? '#22c55e' : val < 0 ? '#ef4444' : '#e6edf3';
    ctx.fillText(usePts ? (val == null ? '-' : (val > 0 ? '+' : '') + fmtNum(val, 2) + ' pts') : fmtUSD(val), 40, 375);
  }

  if (o.rMultiple) {
    ctx.font = '600 22px Arial';
    ctx.fillStyle = '#8b98a9';
    const rTxt = t.rMultiple == null ? '' : fmtR(t.rMultiple) + '   ·   ' + fmtNum(t.resultPoints, 2) + ' pts';
    ctx.fillText(rTxt, 40, 415);
  }

  // tag row
  if (o.tags) {
    const tags = [t.setup, t.model, t.entryModel, t.newsEvent].filter(Boolean);
    let tx = 40;
    ctx.font = '600 15px Arial';
    for (const tag of tags) {
      const tw = ctx.measureText(tag).width + 28;
      if (tx + tw > leftW - 40) break;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, tx, 450, tw, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#c9d3e0';
      ctx.fillText(tag, tx + 14, 472);
      tx += tw + 10;
    }
  }

  // notes (wrapped, grows the card downward)
  if (noteLines.length) {
    ctx.font = '13px Arial';
    ctx.fillStyle = '#8b98a9';
    ctx.fillText('NOTES', 40, NOTES_LABEL_Y);
    ctx.font = NOTES_FONT;
    ctx.fillStyle = '#c9d3e0';
    noteLines.forEach((ln, i) => ctx.fillText(ln, 40, notesTextTop + i * NOTES_LH));
  }

  // footer
  if (o.footer) {
    ctx.font = '13px Arial';
    ctx.fillStyle = '#5b6577';
    ctx.fillText(`${t.contracts || ''} contract${t.contracts == 1 ? '' : 's'} · ${t.session || ''}`, 40, H - 36);
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
  brand: true, date: true, symbol: true, entryExit: true, result: true,
  rMultiple: true, tags: true, notes: true, footer: true, screenshot: true, pnlPoints: false, qr: true,
};
const TOGGLES = [
  ['result', 'P&L'], ['symbol', 'Symbol'], ['entryExit', 'Entry/Exit'], ['rMultiple', 'R / pts'],
  ['tags', 'Tags'], ['notes', 'Notes'], ['date', 'Date'], ['brand', 'Logo'], ['footer', 'Footer'], ['screenshot', 'Screenshot'], ['qr', 'QR'],
];

export default function ShareCard({ trade, onClose }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const tog = (k) => setOpts((o) => ({ ...o, [k]: !o[k] }));

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      await draw(canvasRef.current, trade, opts);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [trade, opts]);

  function download() {
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `pugzilla-${trade.symbol || 'trade'}-${trade.date || ''}.png`;
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
          <h2>Share trade</h2>
          <button className="close-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 10, fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <input type="checkbox" checked={opts.pnlPoints} onChange={() => tog('pnlPoints')} /> P&L in points
            </label>
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
