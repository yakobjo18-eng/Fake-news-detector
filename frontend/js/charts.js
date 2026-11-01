import { escapeHtml } from "./components.js";

/**
 * Horizontal diverging bar chart for signed contribution values (e.g. SHAP scores).
 * items: [{ label, value }], values can be positive or negative.
 * positiveFill/negativeFill are CSS classes (e.g. "fill-fake"/"fill-real") the
 * caller picks based on which direction is Fake vs. Real — this chart doesn't
 * assume positive always means Fake. aria-label carries the exact value so the
 * signal survives for screen readers / keyboard users, not just the hover `title`.
 */
export function signedBarChart(items, { positiveFill = "fill-solid", negativeFill = "fill-solid", positiveWord = "toward", negativeWord = "away from", unit = "" } = {}) {
  if (!items.length) return "";
  const maxAbs = Math.max(...items.map((i) => Math.abs(i.value)), 1e-6);
  const rows = items
    .map((item) => {
      const pct = (Math.abs(item.value) / maxAbs) * 50; // half-width from the zero line
      const isPositive = item.value >= 0;
      const fillClass = isPositive ? positiveFill : negativeFill;
      const side = isPositive
        ? `left:50%;width:${pct}%;border-radius:0 3px 3px 0;`
        : `right:50%;width:${pct}%;border-radius:3px 0 0 3px;`;
      const direction = isPositive ? positiveWord : negativeWord;
      const label = `${item.label || "token"}: ${direction}, ${Math.abs(item.value).toFixed(4)}${unit}`;
      return `
        <div class="bar-row">
          <span class="bar-token" title="${escapeHtml(item.label)}">${escapeHtml(item.label) || "&nbsp;"}</span>
          <div class="bar-track" role="img" aria-label="${escapeHtml(label)}">
            <div class="bar-zero"></div><div class="bar-fill ${fillClass}" style="${side}"></div>
          </div>
          <span class="bar-value">${item.value >= 0 ? "+" : ""}${item.value.toFixed(4)}${unit}</span>
        </div>
      `;
    })
    .join("");
  return `<div class="bar-chart">${rows}</div>`;
}

/** Simple non-negative horizontal bars for comparing a single metric across models. */
export function metricBarChart(items) {
  const maxVal = Math.max(...items.map((i) => i.value), 1e-6);
  const rows = items
    .map((item) => {
      const pct = (item.value / maxVal) * 100;
      const pctLabel = `${(item.value * 100).toFixed(2)}%`;
      return `
        <div class="bar-row" style="grid-template-columns:140px 1fr 72px;">
          <span class="bar-token" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
          <div class="bar-track" role="img" aria-label="${escapeHtml(item.label)}: ${pctLabel}">
            <div class="bar-fill fill-solid" style="left:0;width:${pct}%;border-radius:3px;"></div>
          </div>
          <span class="bar-value">${pctLabel}</span>
        </div>
      `;
    })
    .join("");
  return `<div class="bar-chart">${rows}</div>`;
}

/** 2x2 confusion matrix heatmap. matrix = [[tn, fp], [fn, tp]] (rows=actual, cols=predicted).
 *  Correct (diagonal) = green fill, intensity by magnitude. Incorrect = red
 *  outline, so right/wrong reads from both color and border shape. */
export function confusionHeatmap(matrix, labels = ["Class 0", "Class 1"]) {
  const total = matrix.flat().reduce((a, b) => a + b, 0) || 1;
  const cell = (value, isCorrect, rowLabel, colLabel) => {
    const intensity = Math.min(value / total, 0.5) * 2; // 0..1
    const bg = isCorrect ? `rgba(66, 201, 154, ${0.12 + intensity * 0.6})` : "transparent";
    const statusWord = isCorrect ? "correct" : "incorrect";
    const label = `Actual ${rowLabel}, predicted ${colLabel}: ${value.toLocaleString()} (${statusWord})`;
    return `<div class="hm-cell ${isCorrect ? "hm-correct" : "hm-incorrect"}" style="background:${bg}" role="img" aria-label="${escapeHtml(label)}">${value.toLocaleString()}</div>`;
  };
  return `
    <div class="heatmap">
      <div></div>
      <div class="hm-head">Predicted ${escapeHtml(labels[0])}</div>
      <div class="hm-head">Predicted ${escapeHtml(labels[1])}</div>
      <div class="hm-label">Actual ${escapeHtml(labels[0])}</div>
      ${cell(matrix[0][0], true, labels[0], labels[0])}
      ${cell(matrix[0][1], false, labels[0], labels[1])}
      <div class="hm-label">Actual ${escapeHtml(labels[1])}</div>
      ${cell(matrix[1][0], false, labels[1], labels[0])}
      ${cell(matrix[1][1], true, labels[1], labels[1])}
    </div>
  `;
}
