import { banner, labelPill, emptyState, escapeHtml } from "../components.js";
import { getHistory, clearHistory } from "../storage.js";
import { icons } from "../icons.js";

export const route = "history";
export const title = "Analysis History";
export const subtitle = "Analyses you've run in this browser.";

function renderList() {
  const items = getHistory();
  if (!items.length) {
    return emptyState("No analyses yet in this browser. Results from Analyze Article and the Explainability Lab will appear here.", "history");
  }
  return items
    .map(
      (item) => `
      <div class="history-item">
        <div>
          <div class="excerpt">${escapeHtml(item.excerpt || "(no text)")}</div>
          <div class="meta mono">${new Date(item.ts).toLocaleString()} &middot; ${item.type === "explain" ? "Explainability Lab" : "Analyze Article"}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          ${labelPill(item.label)}
          <div class="meta mono">${(item.confidence * 100).toFixed(1)}%</div>
        </div>
      </div>`
    )
    .join("");
}

export function render() {
  return `
    <div class="page-header">
      <div class="page-title">${title}</div>
      <div class="page-subtitle">${subtitle}</div>
    </div>

    ${banner(
      "Stored locally in this browser only (localStorage), not saved to a server and not shared across devices. Clearing your browser data removes it.",
      { tone: "info" }
    )}

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);">
        <div class="section-label" style="margin:0;">Recent analyses</div>
        <button id="hist-clear" class="btn btn-ghost">${icons.reset} Clear history</button>
      </div>
      <div id="hist-list">${renderList()}</div>
    </div>
  `;
}

export function mount(root) {
  root.querySelector("#hist-clear").addEventListener("click", () => {
    clearHistory();
    root.querySelector("#hist-list").innerHTML = renderList();
  });
}
