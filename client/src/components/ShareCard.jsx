import React, { useEffect, useRef, useState } from 'react';
import { fmtUSD, fmtNum, fmtR, pnlClass } from '../helpers.js';

const W = 1200, H = 630;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function draw(canvas, t) {
  const ctx = canvas.getContext('2d');
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

  const shot = (t.screenshots || [])[0];
  const hasImage = !!shot;
  const leftW = hasImage ? 680 : W;

  // logo + wordmark
  const logo = await loadImage('/pugzilla-logo.jpg');
  if (logo) {
    roundRect(ctx, 40, 36, 48, 48, 12);
    ctx.save(); ctx.clip();
    ctx.drawImage(logo, 40, 36, 48, 48);
    ctx.restore();
  }
  ctx.fillStyle = '#e6edf3';
  ctx.font = '700 24px Arial';
  ctx.fillText('Pugzilla', 100, 58);
  ctx.fillStyle = '#3b82f6';
  ctx.fillText('zilla', 100 + ctx.measureText('Pug').width, 58);

  ctx.fillStyle = '#8b98a9';
  ctx.font = '14px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${t.date || ''} ${t.time || ''}`.trim(), leftW - 40, 50);
  ctx.textAlign = 'left';

  // symbol + direction pill
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

  // entry / exit
  ctx.font = '13px Arial';
  ctx.fillStyle = '#8b98a9';
  ctx.fillText('ENTRY', 40, 210);
  ctx.fillText('EXIT', 220, 210);
  ctx.font = '700 30px Arial';
  ctx.fillStyle = '#e6edf3';
  ctx.fillText(fmtNum(t.entry, 2), 40, 245);
  ctx.fillText(fmtNum(t.exit, 2), 220, 245);

  // big PnL
  ctx.font = '13px Arial';
  ctx.fillStyle = '#8b98a9';
  ctx.fillText('RESULT', 40, 300);
  ctx.font = '700 72px Arial';
  ctx.fillStyle = t.resultDollars > 0 ? '#22c55e' : t.resultDollars < 0 ? '#ef4444' : '#e6edf3';
  ctx.fillText(fmtUSD(t.resultDollars), 40, 375);

  ctx.font = '600 22px Arial';
  ctx.fillStyle = '#8b98a9';
  const rTxt = t.rMultiple == null ? '' : fmtR(t.rMultiple) + '   ·   ' + fmtNum(t.resultPoints, 2) + ' pts';
  ctx.fillText(rTxt, 40, 415);

  // tag row
  const tags = [t.setup, t.model, t.entryModel, t.htfDelivery, t.newsEvent].filter(Boolean);
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

  // footer
  ctx.font = '13px Arial';
  ctx.fillStyle = '#5b6577';
  ctx.fillText(`${t.contracts || ''} contract${t.contracts == 1 ? '' : 's'} · ${t.session || ''}`, 40, H - 36);
  ctx.textAlign = 'right';
  ctx.fillText('pugzilla journal', leftW - 40, H - 36);
  ctx.textAlign = 'left';

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

export default function ShareCard({ trade, onClose }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await draw(canvasRef.current, trade);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [trade]);

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
