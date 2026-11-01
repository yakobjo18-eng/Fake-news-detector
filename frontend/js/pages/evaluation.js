import { banner, emptyState, escapeHtml } from "../components.js";
import { confusionHeatmap } from "../charts.js";

export const route = "evaluation";
export const title = "Evaluation & Robustness";
export const subtitle = "Confusion matrix, per-class metrics, and documented reliability caveats for the DeBERTa v3 checkpoint.";

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}

export function render() {
  return `
    <div class="page-header">
      <div class="page-title">${title}</div>
      <div class="page-subtitle">${subtitle}</div>
    </div>
    <div id="ev-body">${emptyState("Loading saved evaluation results...")}</div>
  `;
}

export async function mount(root) {
  const body = root.querySelector("#ev-body");
  try {
    const metrics = await fetch("data/deberta_metrics.json").then((r) => r.json());
    const cm = metrics.confusion_matrix;

    body.innerHTML = `
      ${banner(
        `No adversarial robustness suite has been run against this model, and no formal latency
         benchmark exists. The timings below are single measurements taken on one CPU during
         development, not a benchmark suite. The label mapping (0 = Real, 1 = Fake) used to
         produce this confusion matrix was inferred behaviorally, not confirmed from the
         original training notebook &mdash; see
         <a href="../LABEL_MAPPING_VERIFICATION.md" target="_blank" rel="noopener">LABEL_MAPPING_VERIFICATION.md</a>.`
      )}

      <div class="card-row cols-2" style="align-items:start;">
        <div class="card">
          <div class="section-label">Confusion matrix (test set, n=${metrics.test_samples.toLocaleString()})</div>
          ${confusionHeatmap(cm, ["Real", "Fake"])}
        </div>
        <div class="card">
          <div class="section-label">Aggregate metrics</div>
          <div class="table-wrap">
            <table>
              <tbody>
                <tr><td>Accuracy</td><td class="mono">${pct(metrics.test_accuracy)}</td></tr>
                <tr><td>Macro precision</td><td class="mono">${pct(metrics.test_macro_precision)}</td></tr>
                <tr><td>Macro recall</td><td class="mono">${pct(metrics.test_macro_recall)}</td></tr>
                <tr><td>Macro F1</td><td class="mono">${pct(metrics.test_macro_f1)}</td></tr>
                <tr><td>Test samples</td><td class="mono">${metrics.test_samples.toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
          <p class="disclaimer">${escapeHtml(metrics.verification_status)}</p>
        </div>
      </div>

      <div class="card">
        <div class="section-label">Per-class metrics</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
            <tbody>
              <tr><td>0 (Real)</td><td class="mono">${pct(metrics.classification_report["0"].precision)}</td><td class="mono">${pct(metrics.classification_report["0"].recall)}</td><td class="mono">${pct(metrics.classification_report["0"].f1)}</td><td class="mono">${metrics.classification_report["0"].support}</td></tr>
              <tr><td>1 (Fake)</td><td class="mono">${pct(metrics.classification_report["1"].precision)}</td><td class="mono">${pct(metrics.classification_report["1"].recall)}</td><td class="mono">${pct(metrics.classification_report["1"].f1)}</td><td class="mono">${metrics.classification_report["1"].support}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="section-label">Measured latency (single dev-machine measurements, CPU, model pre-loaded)</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Endpoint</th><th>Input size</th><th>Observed time</th></tr></thead>
            <tbody>
              <tr><td class="mono">POST /api/predict</td><td>~95 characters</td><td class="mono">~250-900 ms</td></tr>
              <tr><td class="mono">POST /api/explain</td><td>~110 characters</td><td class="mono">~5.7 s</td></tr>
              <tr><td class="mono">POST /api/explain</td><td>~620 characters (near the 700-char SHAP truncation limit)</td><td class="mono">~12.5 s</td></tr>
            </tbody>
          </table>
        </div>
        <p class="disclaimer">
          Measured 2026-10-25 against a warm (already-loaded) local model on CPU, no GPU.
          This is not a load test and does not reflect concurrent-request behavior.
        </p>
      </div>

      <div class="card">
        <div class="section-label">Known reliability limitations</div>
        <ul style="padding-left:var(--space-5);color:var(--text-secondary);font-size:13.5px;line-height:1.8;">
          <li>Label mapping (0=Real, 1=Fake) is empirically inferred from model behavior, not confirmed from the original training code.</li>
          <li>The 99.81% test accuracy figure was reviewed for internal consistency only; it was not recomputed, and train/test duplicate/near-duplicate leakage has not been checked because the raw split data is not available in this project.</li>
          <li>No adversarial robustness testing (e.g. paraphrase attacks, typo perturbation) has been performed.</li>
          <li>Generalization to real-world, out-of-distribution articles is unverified.</li>
        </ul>
      </div>
    `;
  } catch (err) {
    body.innerHTML = emptyState("Could not load saved evaluation results (data/deberta_metrics.json).");
  }
}
