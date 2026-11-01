// Minimal inline stroke icons (no icon library dependency). All 18x18, stroke-based.
const base = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const icons = {
  analyze: base('<circle cx="10.5" cy="10.5" r="6.5"/><line x1="19" y1="19" x2="15.2" y2="15.2"/>'),
  explain: base('<path d="M12 2a5 5 0 0 1 5 5c0 2-1 3-2 4.5S14 14 14 16h-4c0-2-.5-3-1.5-4.5S7 9 7 7a5 5 0 0 1 5-5Z"/><line x1="9.5" y1="19" x2="14.5" y2="19"/><line x1="10.5" y1="22" x2="13.5" y2="22"/>'),
  compare: base('<line x1="6" y1="20" x2="6" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/>'),
  evaluation: base('<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z"/><path d="M9 12l2 2 4-4"/>'),
  history: base('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  settings: base('<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.6-1.3-1.5-2.6-1.9.6a7.4 7.4 0 0 0-2.6-1.5L14.6 3h-5.2l-.4 1.9a7.4 7.4 0 0 0-2.6 1.5l-1.9-.6-1.5 2.6 1.6 1.3a7.6 7.6 0 0 0 0 3L3 14.8l1.5 2.6 1.9-.6a7.4 7.4 0 0 0 2.6 1.5l.4 2h5.2l.4-2a7.4 7.4 0 0 0 2.6-1.5l1.9.6 1.5-2.6Z"/>'),
  chevron: base('<polyline points="9 18 15 12 9 6"/>'),
  menu: base('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>'),
  close: base('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>'),
  warning: base('<path d="M12 3 2 20h20L12 3Z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.1"/>'),
  info: base('<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="7.5" x2="12" y2="7.6"/>'),
  check: base('<polyline points="4 12 9 18 20 6"/>'),
  alert: base('<circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="13"/><line x1="12" y1="16" x2="12" y2="16.1"/>'),
  reset: base('<polyline points="3 7 3 3 7 3"/><path d="M3 3c5 5 12 5 17 0"/><polyline points="21 17 21 21 17 21"/><path d="M21 21c-5-5-12-5-17 0"/>'),
};
