import { getHealth } from "../api.js";
import { banner, emptyState, escapeHtml } from "../components.js";
import { getPrefs, setPrefs } from "../storage.js";

export const route = "settings";
export const title = "Settings";
export const subtitle = "Model metadata and connection status.";

export function render() {
  const prefs = getPrefs();
  return `
    <div class="page-header">
      <div class="page-title">${title}</div>
      <div class="page-subtitle">${subtitle}</div>
    </div>

    <div class="card">
      <div class="section-label">Model metadata (static, documented)</div>
      <div class="table-wrap">
        <table>
          <tbody>
            <tr><td>Base model</td><td class="mono">microsoft/deberta-v3-base</td></tr>
            <tr><td>Task</td><td>Fine-tuned binary classification (Real / Fake)</td></tr>
            <tr><td>Training data</td><td>WELFake</td></tr>
            <tr><td>Max sequence length</td><td class="mono">256 tokens</td></tr>
            <tr><td>Label mapping</td><td>Empirically verified against the deployed checkpoint &mdash; see <a href="../LABEL_MAPPING_VERIFICATION.md" target="_blank" rel="noopener">LABEL_MAPPING_VERIFICATION.md</a></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="section-label">Connection status (live)</div>
      <div id="set-health">${emptyState("Checking backend connection...")}</div>
    </div>

    <div class="card">
      <div class="section-label">Preferences</div>
      <div class="switch-row">
        <div>
          <div class="label">Compact sidebar</div>
          <div class="hint">Collapse navigation labels to icons only.</div>
        </div>
        <button id="set-compact" class="switch" role="switch" aria-checked="${prefs.compactSidebar ? "true" : "false"}" aria-label="Compact sidebar">
          <span class="knob"></span>
        </button>
      </div>
      <div class="switch-row">
        <div>
          <div class="label">Reduced motion</div>
          <div class="hint">Automatically follows your OS "reduce motion" accessibility setting.</div>
        </div>
        <span class="pill pill-neutral">System setting</span>
      </div>
    </div>
  `;
}

export function mount(root, _navigate, { onCompactToggle } = {}) {
  getHealth()
    .then((data) => {
      root.querySelector("#set-health").innerHTML = `
        ${banner(
          `Model loaded: <strong>${data.model_loaded ? "yes" : "no"}</strong> &middot;
           label mapping method: <span class="mono">${escapeHtml(data.label_mapping_method)}</span>`,
          { tone: "info" }
        )}
      `;
    })
    .catch(() => {
      root.querySelector("#set-health").innerHTML = banner("Backend unreachable. Start it with: python -m uvicorn backend.main:app");
    });

  const compactBtn = root.querySelector("#set-compact");
  compactBtn.addEventListener("click", () => {
    const next = compactBtn.getAttribute("aria-checked") !== "true";
    compactBtn.setAttribute("aria-checked", String(next));
    setPrefs({ compactSidebar: next });
    onCompactToggle?.(next);
  });
}
