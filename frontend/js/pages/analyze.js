import { getHealth, predict } from "../api.js";
import { banner, predictionCard, loadingState, emptyState, errorBanner, escapeHtml, DISCLAIMER } from "../components.js";
import { addHistoryEntry, setHandoff } from "../storage.js";
import { icons } from "../icons.js";

export const route = "analyze";
export const title = "Analyze Article";
export const subtitle = "Classify a headline and/or body with the fine-tuned DeBERTa v3 model.";

export function render() {
  return `
    <div class="page-header">
      <div class="page-title">${title}</div>
      <div class="page-subtitle">${subtitle}</div>
    </div>

    <div id="an-status"></div>

    <div class="card-row cols-2" style="align-items:start;">
      <div class="card">
        <div class="field">
          <label for="an-title">Title <span class="optional">(optional)</span></label>
          <input id="an-title" type="text" maxlength="300" placeholder="Headline of the article" />
        </div>
        <div class="field">
          <label for="an-body">Body text</label>
          <textarea id="an-body" rows="10" maxlength="20000" placeholder="Paste the article text here"></textarea>
          <div class="char-count"><span id="an-count">0</span> / 20000 characters</div>
        </div>
        <div id="an-validation"></div>
        <div class="btn-row">
          <button id="an-predict" class="btn btn-primary">${icons.analyze} Analyze</button>
          <button id="an-reset" class="btn btn-ghost">${icons.reset} Reset</button>
        </div>
      </div>

      <div class="card">
        <div class="section-label">Result</div>
        <div id="an-result">${emptyState("Submit an article to see a prediction.")}</div>
      </div>
    </div>
  `;
}

export function mount(root, navigate) {
  const statusEl = root.querySelector("#an-status");
  getHealth()
    .then((data) => {
      if (!data.model_loaded) {
        statusEl.innerHTML = banner("Backend reachable, but the model did not load. Check the server log.");
        return;
      }
      statusEl.innerHTML = banner(
        `Model loaded &middot; label mapping: <span class="mono">${escapeHtml(data.label_mapping_method)}</span>
         (empirically verified against this checkpoint, not the original training notebook — see
         <a href="../LABEL_MAPPING_VERIFICATION.md" target="_blank" rel="noopener">LABEL_MAPPING_VERIFICATION.md</a>).`,
        { tone: "info" }
      );
    })
    .catch(() => {
      statusEl.innerHTML = banner("Unable to reach the backend. Start it with: python -m uvicorn backend.main:app");
    });

  const titleInput = root.querySelector("#an-title");
  const bodyInput = root.querySelector("#an-body");
  const countEl = root.querySelector("#an-count");
  const validationEl = root.querySelector("#an-validation");
  const resultEl = root.querySelector("#an-result");
  const predictBtn = root.querySelector("#an-predict");
  const resetBtn = root.querySelector("#an-reset");

  bodyInput.addEventListener("input", () => {
    countEl.textContent = String(bodyInput.value.length);
  });

  resetBtn.addEventListener("click", () => {
    titleInput.value = "";
    bodyInput.value = "";
    countEl.textContent = "0";
    validationEl.innerHTML = "";
    resultEl.innerHTML = emptyState("Submit an article to see a prediction.");
  });

  async function runPredict() {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title && !body) {
      validationEl.innerHTML = errorBanner("Please enter a title and/or body text before submitting.");
      return;
    }
    validationEl.innerHTML = "";
    predictBtn.disabled = true;
    resultEl.innerHTML = loadingState("Running model...");

    try {
      const prediction = await predict({ title, body });
      resultEl.innerHTML =
        predictionCard(prediction) +
        `<div class="btn-row"><button id="an-to-explain" class="btn btn-secondary">${icons.explain} Explain this prediction</button></div>`;

      addHistoryEntry({
        type: "predict",
        title,
        excerpt: (title || body).slice(0, 140),
        label: prediction.label,
        confidence: prediction.confidence,
        predicted_class: prediction.predicted_class,
      });

      root.querySelector("#an-to-explain")?.addEventListener("click", () => {
        setHandoff({ title, body });
        navigate("explain");
      });
    } catch (err) {
      resultEl.innerHTML = errorBanner(err.message || "Prediction failed.") + `<p class="disclaimer">${DISCLAIMER}</p>`;
    } finally {
      predictBtn.disabled = false;
    }
  }

  predictBtn.addEventListener("click", runPredict);
}
