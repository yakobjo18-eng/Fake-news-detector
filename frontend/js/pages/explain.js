import { explain } from "../api.js";
import { predictionCard, loadingState, emptyState, errorBanner, escapeHtml } from "../components.js";
import { signedBarChart } from "../charts.js";
import { addHistoryEntry, takeHandoff } from "../storage.js";
import { icons } from "../icons.js";

export const route = "explain";
export const title = "Explainability Lab";
export const subtitle = "Word-level SHAP attribution for the same DeBERTa v3 checkpoint used on the Analyze page.";

// Backend contributions are already computed for the predicted class only (explain.py),
// so contribution >= 0 always means "pushed toward the predicted label" and < 0 means
// "pushed toward the other class". Fake = red, Real = green: which color a given
// contribution gets depends on which class it points toward, not just its sign.
function isTowardPredicted(value) {
  return value >= 0;
}

function isTowardFake(value, predictedLabel) {
  const towardPredicted = isTowardPredicted(value);
  return predictedLabel === "Fake" ? towardPredicted : !towardPredicted;
}

function tokenHighlight(allTokens, predictedLabel) {
  const maxAbs = Math.max(...allTokens.map((t) => Math.abs(t.contribution)), 1e-6);
  return allTokens
    .map((t) => {
      const intensity = Math.min(Math.abs(t.contribution) / maxAbs, 1);
      const safe = escapeHtml(t.token);
      const titleAttr = `title="${t.contribution.toFixed(4)}"`;
      const alpha = (0.18 + intensity * 0.65).toFixed(2);
      const rgb = isTowardFake(t.contribution, predictedLabel) ? "240,113,124" : "66,201,154";
      return `<span class="tok" style="background:rgba(${rgb},${alpha})" ${titleAttr}>${safe}</span>`;
    })
    .join("");
}

function contributionSummary(topContributions, predictedLabel) {
  const named = topContributions.filter((t) => t.token.trim());
  const toward = named.filter((t) => isTowardPredicted(t.contribution)).slice(0, 6);
  const away = named.filter((t) => !isTowardPredicted(t.contribution)).slice(0, 6);

  const list = (items) =>
    items.map((t) => `<span class="pill pill-neutral mono" style="margin:2px;">${escapeHtml(t.token.trim())}</span>`).join(" ") ||
    '<span class="disclaimer">none among the top contributors</span>';

  return `
    <div class="section-label" style="margin-top:var(--space-5);">Pushed toward "${escapeHtml(predictedLabel)}"</div>
    <div>${list(toward)}</div>
    <div class="section-label" style="margin-top:var(--space-4);">Pushed away from "${escapeHtml(predictedLabel)}"</div>
    <div>${list(away)}</div>
  `;
}

export function render() {
  return `
    <div class="page-header">
      <div class="page-title">${title}</div>
      <div class="page-subtitle">${subtitle}</div>
    </div>

    <div class="card">
      <div class="field">
        <label for="ex-title">Title <span class="optional">(optional)</span></label>
        <input id="ex-title" type="text" maxlength="300" placeholder="Headline of the article" />
      </div>
      <div class="field">
        <label for="ex-body">Body text</label>
        <textarea id="ex-body" rows="8" maxlength="20000" placeholder="Paste the article text here"></textarea>
      </div>
      <div id="ex-validation"></div>
      <div class="btn-row">
        <button id="ex-run" class="btn btn-primary">${icons.explain} Generate explanation</button>
      </div>
    </div>

    <div class="card">
      <div class="section-label">Result</div>
      <div id="ex-result">${emptyState("Submit an article to generate a SHAP explanation. This computes ~15-30 seconds on CPU because it runs many forward passes through the model.")}</div>
    </div>
  `;
}

export function mount(root) {
  const titleInput = root.querySelector("#ex-title");
  const bodyInput = root.querySelector("#ex-body");
  const validationEl = root.querySelector("#ex-validation");
  const resultEl = root.querySelector("#ex-result");
  const runBtn = root.querySelector("#ex-run");

  const handoff = takeHandoff();
  if (handoff) {
    titleInput.value = handoff.title || "";
    bodyInput.value = handoff.body || "";
  }

  async function run() {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title && !body) {
      validationEl.innerHTML = errorBanner("Please enter a title and/or body text before submitting.");
      return;
    }
    validationEl.innerHTML = "";
    runBtn.disabled = true;
    resultEl.innerHTML = loadingState("Running model and computing SHAP explanation (roughly 15-30 seconds on CPU)...");

    try {
      const data = await explain({ title, body });
      const { prediction, explanation, explanation_error } = data;

      let html = predictionCard(prediction);

      if (explanation_error) {
        html += errorBanner(`Explanation unavailable: ${explanation_error}. The prediction above is still valid — SHAP failures never invalidate a prediction.`);
      } else if (explanation) {
        const barItems = explanation.top_contributions
          .filter((t) => t.token.trim())
          .slice(0, 15)
          .map((t) => ({ label: t.token.trim(), value: t.contribution }));
        // Positive = toward predicted class; map that to the Fake/Real color axis
        // rather than assuming positive is always Fake.
        const positiveFill = prediction.label === "Fake" ? "fill-fake" : "fill-real";
        const negativeFill = prediction.label === "Fake" ? "fill-real" : "fill-fake";

        html += `
          <div class="section-label" style="margin-top:var(--space-5);">Top contributing tokens</div>
          ${signedBarChart(barItems, {
            positiveFill,
            negativeFill,
            positiveWord: `toward "${prediction.label}"`,
            negativeWord: `away from "${prediction.label}"`,
          })}
          <p class="disclaimer" style="margin-top:var(--space-2);">
            Red bars push toward Fake; green bars push toward Real.
          </p>

          <div class="section-label" style="margin-top:var(--space-5);">Highlighted text</div>
          <p class="disclaimer" style="margin-top:0;margin-bottom:var(--space-3);border-top:none;padding-top:0;">
            Red words push toward Fake; green words push toward Real.
          </p>
          <div class="token-text">${tokenHighlight(explanation.all_tokens, prediction.label)}</div>

          ${contributionSummary(explanation.top_contributions, prediction.label)}

          ${explanation.text_truncated ? `<p class="disclaimer">Input was truncated to ${explanation.explained_char_count} characters for explanation performance.</p>` : ""}
          <p class="disclaimer">${escapeHtml(explanation.disclaimer)}</p>
        `;

        addHistoryEntry({
          type: "explain",
          title,
          excerpt: (title || body).slice(0, 140),
          label: prediction.label,
          confidence: prediction.confidence,
          predicted_class: prediction.predicted_class,
        });
      } else {
        html += emptyState("No explanation was returned for this result.");
      }

      resultEl.innerHTML = html;
    } catch (err) {
      resultEl.innerHTML = errorBanner(err.message || "Request failed.");
    } finally {
      runBtn.disabled = false;
    }
  }

  runBtn.addEventListener("click", run);
}
