import { icons } from "./icons.js";

export const DISCLAIMER =
  "AI predictions are model assessments, not definitive proof of factual accuracy. Verify important claims using reliable sources.";

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Fake = red, Real = green (explicit instruction). Icon shape (alert vs. check)
// is kept alongside color, not replaced by it, and the text label is always
// present too, so the signal doesn't depend on hue perception alone.
export function labelPill(label) {
  if (label === "Fake") return `<span class="pill pill-fake">${icons.alert}${escapeHtml(label)}</span>`;
  if (label === "Real") return `<span class="pill pill-real">${icons.check}${escapeHtml(label)}</span>`;
  return `<span class="pill pill-neutral">${escapeHtml(label)}</span>`;
}

export function probabilityBars(probabilities) {
  const real = probabilities.real ?? probabilities.class_0;
  const fake = probabilities.fake ?? probabilities.class_1;
  const row = (name, value, fillClass) => {
    const pct = Math.round(value * 1000) / 10;
    return `
      <div class="prob-row"><span>${name}</span><span class="mono">${pct}%</span></div>
      <div class="prob-track"><div class="prob-fill ${fillClass}" style="width:${pct}%"></div></div>
    `;
  };
  return row("Real", real, "fill-real") + row("Fake", fake, "fill-fake");
}

export function predictionCard(prediction) {
  return `
    <div class="result-head" style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">
      ${labelPill(prediction.label)}
      <span class="mono" style="color:var(--text-secondary);font-size:12.5px;">confidence ${(prediction.confidence * 100).toFixed(2)}%</span>
    </div>
    ${probabilityBars(prediction.probabilities)}
    <p class="disclaimer">
      Predicted class id: <span class="mono">${prediction.predicted_class}</span> &middot;
      label mapping method: <span class="mono">${escapeHtml(prediction.label_mapping_method)}</span>
      (empirically verified against this checkpoint &mdash; see
      <a href="../LABEL_MAPPING_VERIFICATION.md" target="_blank" rel="noopener">LABEL_MAPPING_VERIFICATION.md</a>).
      ${DISCLAIMER}
    </p>
  `;
}

export function loadingState(text) {
  return `<div class="state-block"><div class="spinner"></div><span>${escapeHtml(text)}</span></div>`;
}

export function emptyState(text, iconKey = "info") {
  return `<div class="state-block">${icons[iconKey] ?? ""}<span>${escapeHtml(text)}</span></div>`;
}

export function errorBanner(message) {
  return `<div class="inline-error">${escapeHtml(message)}</div>`;
}

export function banner(text, { tone = "warning" } = {}) {
  const icon = tone === "info" ? icons.info : icons.warning;
  return `<div class="banner ${tone === "info" ? "info" : ""}">${icon}<div>${text}</div></div>`;
}
