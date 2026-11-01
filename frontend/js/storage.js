// Browser-local-only helpers. Nothing here is sent to or persisted by the backend.
// Explicitly NOT a claim of server-side history: it lives in this browser's
// localStorage only, and is lost if site data is cleared.

const HISTORY_KEY = "verity.history.v1";
const PREFS_KEY = "verity.prefs.v1";
const HANDOFF_KEY = "verity.handoff.v1";
const MAX_HISTORY = 50;

function safeParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function getHistory() {
  try {
    return safeParse(localStorage.getItem(HISTORY_KEY), []);
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry) {
  try {
    const list = getHistory();
    list.unshift({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — silently skip, never breaks the UI.
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export function getPrefs() {
  try {
    return safeParse(localStorage.getItem(PREFS_KEY), { compactSidebar: false });
  } catch {
    return { compactSidebar: false };
  }
}

export function setPrefs(partial) {
  try {
    const next = { ...getPrefs(), ...partial };
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return getPrefs();
  }
}

// Short-lived handoff so "Explain this" on the Analyze page can prefill the
// Explainability Lab without changing any API payload or adding backend state.
export function setHandoff(data) {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function takeHandoff() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    sessionStorage.removeItem(HANDOFF_KEY);
    return raw ? safeParse(raw, null) : null;
  } catch {
    return null;
  }
}
