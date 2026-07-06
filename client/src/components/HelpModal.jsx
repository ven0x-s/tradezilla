import React from 'react';

const SHORTCUTS = [
  ['N', 'New trade'],
  ['Q', 'Quick add (mobile-friendly)'],
  ['S', 'Save the open trade'],
  ['Esc', 'Close / cancel modal'],
  ['1 – 9', 'Toggle setup tag in the trade form'],
  ['D', 'Toggle dark / light mode'],
  ['?', 'Show this help'],
];

export default function HelpModal({ onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <h2>Keyboard shortcuts</h2>
          <button className="close-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="shortcut-list">
            {SHORTCUTS.map(([k, d]) => (
              <React.Fragment key={k}>
                <kbd>{k}</kbd><span>{d}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
