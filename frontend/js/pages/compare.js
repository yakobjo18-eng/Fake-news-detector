import { banner, emptyState, escapeHtml } from "../components.js";
import { metricBarChart } from "../charts.js";

export const route = "compare";
export const title = "Model Comparison";
export const subtitle = "DeBERTa v3 vs. the TF-IDF + Logistic Regression baseline, from saved evaluation results.";

function pct(x) {
  return x == null ? "—" : `${(x * 100).toFixed(2)}%`;
}

export function render() {
  return `
    <div class="page-header">
      <div class="page-title">${title}</div>
      <div class="page-subtitle">${subtitle}</div>
    </div>
    <div id="cmp-body">${emptyState("Loading saved evaluation results...")}</div>
  `;
}

export async function mount(root) {
  const body = root.querySelector("#cmp-body");
  try {
    const [deberta, tfidf] = await Promise.all([
      fetch("data/deberta_metrics.json").then((r) => r.json()),
      fetch("data/tfidf_baseline.json").then((r) => r.json()),
    ]);

    const accuracyChart = metricBarChart([
      { label: "DeBERTa v3", value: deberta.test_accuracy },
      { label: "TF-IDF + LogReg", value: tfidf.validation_accuracy },
    ]);

    body.innerHTML = `
      ${banner(
        `The DeBERTa v3 accuracy below is a <strong>pre-computed, unverified</strong> figure &mdash;
         it has not been re-checked for train/test duplicate leakage in this project.
         The TF-IDF figure is reported from the project brief only, with no saved metrics file found.
         See <a href="../LABEL_MAPPING_VERIFICATION.md" target="_blank" rel="noopener">LABEL_MAPPING_VERIFICATION.md</a>
         for the full reliability analysis.`
      )}

      <div class="card">
        <div class="section-label">Accuracy (the only metric available for both models)</div>
        ${accuracyChart}
        <p class="disclaimer">Different evaluation sets/methodology may underlie each number — treat this as directional, not a controlled head-to-head comparison.</p>
      </div>

      <div class="card-row cols-2" style="margin-top:var(--space-4);">
        <div class="card">
          <h3 style="margin-bottom:var(--space-3);">microsoft/deberta-v3-base (fine-tuned)</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
              <tbody>
                <tr><td>0 (Real)</td><td class="mono">${pct(deberta.classification_report["0"].precision)}</td><td class="mono">${pct(deberta.classification_report["0"].recall)}</td><td class="mono">${pct(deberta.classification_report["0"].f1)}</td><td class="mono">${deberta.classification_report["0"].support}</td></tr>
                <tr><td>1 (Fake)</td><td class="mono">${pct(deberta.classification_report["1"].precision)}</td><td class="mono">${pct(deberta.classification_report["1"].recall)}</td><td class="mono">${pct(deberta.classification_report["1"].f1)}</td><td class="mono">${deberta.classification_report["1"].support}</td></tr>
              </tbody>
            </table>
          </div>
          <p class="disclaimer">${escapeHtml(deberta.verification_status)}</p>
        </div>

        <div class="card">
          <h3 style="margin-bottom:var(--space-3);">TF-IDF + Logistic Regression</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Metric</th><th>Value</th></tr></thead>
              <tbody>
                <tr><td>Validation accuracy</td><td class="mono">${pct(tfidf.validation_accuracy)}</td></tr>
                <tr><td>Precision</td><td class="mono">${tfidf.precision ?? "Not available"}</td></tr>
                <tr><td>Recall</td><td class="mono">${tfidf.recall ?? "Not available"}</td></tr>
                <tr><td>F1</td><td class="mono">${tfidf.f1 ?? "Not available"}</td></tr>
              </tbody>
            </table>
          </div>
          <p class="disclaimer">${escapeHtml(tfidf.verification_status)}</p>
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = emptyState("Could not load saved evaluation results (data/deberta_metrics.json, data/tfidf_baseline.json).");
  }
}
