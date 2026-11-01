# VERITY — Explainable AI-Based Fake News Detection System

A web app that serves a fine-tuned `microsoft/deberta-v3-base` fake-news classifier
(trained on WELFake) with SHAP-based word-level explanations, behind a multi-page
monochrome UI (Analyze Article — the landing page — Explainability Lab, Model
Comparison, Evaluation & Robustness, Analysis History, Settings). See
[frontend/DESIGN_CONTRACT.md](frontend/DESIGN_CONTRACT.md) for the design direction.

**Read [LABEL_MAPPING_VERIFICATION.md](LABEL_MAPPING_VERIFICATION.md) before trusting any
Fake/Real label this app shows you.** The label mapping was inferred by testing the actual
model's behavior, not confirmed from the original training notebook, and it contradicts the
official WELFake dataset documentation. The reported 99.81% test accuracy is also unverified
for data leakage — see that file for the full reliability analysis.

## Architecture

```
Finalfakenewspred/
├── backend/
│   ├── config.py      # model path, label mapping, SHAP limits — all configurable here
│   ├── inference.py   # loads model/tokenizer once; predict_news(title, body)
│   ├── explain.py      # SHAP explainer, separate from prediction (expensive)
│   └── main.py         # FastAPI app: /api/health, /api/predict, /api/explain
├── frontend/
│   ├── index.html          # app shell (sidebar + content mount point)
│   ├── css/                # tokens.css (design tokens), app.css (all component styles)
│   ├── js/
│   │   ├── main.js, router.js    # hash-based SPA router, no build step/npm required
│   │   ├── api.js                # fetch wrappers for /api/predict, /api/explain, /api/health
│   │   ├── components.js, charts.js, icons.js, storage.js
│   │   └── pages/                # one module per page (overview, analyze, explain, compare, evaluation, history, settings)
│   └── data/                # static copies of saved evaluation results (deberta_metrics.json, tfidf_baseline.json)
├── tests/
│   ├── test_inference.py  # model loading + prediction correctness
│   └── test_api.py        # HTTP endpoint behavior
├── fake_news_final_package/
│   └── deberta_model/      # the actual trained checkpoint used by the app
├── fake_news_model_handoff/ # original handoff docs (predict.py, notes) — kept as-is, unused by the app
├── requirements.txt
└── LABEL_MAPPING_VERIFICATION.md
```

Design choices:
- **Model loads once**, at FastAPI startup (`backend/main.py` lifespan handler), and is
  reused for every request — never reloaded per-request.
- **Model path is configurable** via the `FAKE_NEWS_MODEL_DIR` environment variable
  (`backend/config.py`); defaults to `fake_news_final_package/deberta_model`.
- **Inference logic is separate from the UI**: `backend/inference.py` and `backend/explain.py`
  have no web-framework dependency and can be imported/tested standalone.
- **No retraining anywhere in this codebase.** Only `AutoModelForSequenceClassification.from_pretrained`
  on the local checkpoint directory.

## Setup

1. Install Python 3.10+ (tested on 3.13).
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Model placement: the checkpoint must already be at
   `fake_news_final_package/deberta_model/` (this is already the case in this project — it
   contains `config.json`, `model.safetensors`, `tokenizer.json`, `tokenizer_config.json`).
   To point at a different location instead, set an environment variable before starting the
   server:
   ```
   # PowerShell
   $env:FAKE_NEWS_MODEL_DIR = "C:\path\to\your\checkpoint"
   ```
4. No internet access or GPU is required for inference. CUDA is used automatically if available,
   otherwise it runs on CPU (confirmed working on CPU in this environment).

## Running the app

```
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Then open `http://127.0.0.1:8000/` in a browser. The same server serves both the frontend
(static files) and the JSON API (`/api/*`), so there is nothing else to start.

## Running tests

```
python -m pytest tests/ -v
```

Actual output from this environment (2026-10-25, CPU-only, `transformers` 5.20.1 / `torch`
2.10.0):

```
tests/test_api.py::test_health PASSED
tests/test_api.py::test_predict_valid_input PASSED
tests/test_api.py::test_predict_empty_input_returns_400 PASSED
tests/test_api.py::test_explain_graceful_structure PASSED
tests/test_inference.py::test_model_and_tokenizer_load PASSED
tests/test_inference.py::test_predict_returns_valid_probabilities PASSED
tests/test_inference.py::test_empty_input_raises PASSED
tests/test_inference.py::test_label_mapping_matches_config PASSED
tests/test_inference.py::test_fake_style_and_real_style_predict_different_classes PASSED

9 passed in 19.57s
```

Live end-to-end HTTP checks (server started with uvicorn, hit with `curl`) also passed:
`/api/health` reports `model_loaded: true`; `/api/predict` returned `Real` with 99.999%
confidence for a Fed-rate-decision-style sentence and `Fake` with 99.94% confidence for a
microchip-conspiracy-style sentence; empty input returned HTTP 400; `/api/explain` returned
a full SHAP breakdown in ~7 seconds for a short article.

**Frontend redesign verification** (2026-10-25): the multi-page UI was driven end-to-end with
a headless Chromium browser (Playwright, installed temporarily for this check only — it is
not a project dependency). Verified: navigation across all 7 pages, a Real prediction and a
Fake prediction on Analyze Article, a full SHAP explanation (bar chart + token highlighting)
on Explainability Lab, Model Comparison/Evaluation pages loading their static JSON data,
Analysis History populating from local predictions, the Settings compact-sidebar toggle, and
mobile layout at 390px width with no horizontal overflow — zero browser console/page errors
in the final run. One rendering bug (unconstrained SVG icons rendering at ~300px instead of
18px) was found and fixed during this process.

## API

### `GET /api/health`
Reports whether the model is loaded and which label-mapping method is in effect.

### `POST /api/predict`
Request: `{"title": "...", "body": "..."}` (either may be empty, not both).
Response:
```json
{
  "predicted_class": 1,
  "label": "Fake",
  "label_mapping_verified": true,
  "label_mapping_method": "empirical_behavioral_test",
  "probabilities": {"class_0": 0.0006, "class_1": 0.9994, "real": 0.0006, "fake": 0.9994},
  "confidence": 0.9994,
  "device": "cpu"
}
```
Empty title+body returns HTTP 400 with a clear error message.

### `POST /api/explain`
Same request shape. Returns `{"prediction": {...}, "explanation": {...} | null, "explanation_error": string | null}`.
`explanation` is `null` with `explanation_error` set if SHAP fails for any reason — the
prediction itself is still returned and the app does not break.

## Demo workflow (for a college review / presentation)

1. Start the server (`python -m uvicorn backend.main:app --port 8000`), open the browser —
   you land directly on **Analyze Article**.
2. Paste a real news snippet (e.g. a Reuters/AP-style factual paragraph) into "Body text",
   click **Analyze** → show the "Real" label and high confidence.
3. Reset, paste an obviously fabricated/sensational snippet, click **Analyze** → show "Fake".
4. Click **Explain this prediction** → lands on the **Explainability Lab**, pre-filled with the
   same text → click **Generate explanation** and wait ~10-30 seconds for the SHAP computation,
   then show the diverging bar chart and highlighted text — point out words like "shocking",
   "insider", "secret" pushing toward the Fake prediction.
5. Open **Model Comparison** and **Evaluation & Robustness** to show the saved DeBERTa metrics
   (confusion matrix, per-class precision/recall/F1) and the TF-IDF baseline side by side.
6. Open **Settings** and point to the "Label mapping" row, then open
   `LABEL_MAPPING_VERIFICATION.md` and explain the reliability caveats: the label mapping had
   to be inferred behaviorally (not confirmed from the training notebook) and the headline
   99.81% accuracy figure has not been checked for train/test leakage, because the raw dataset
   split was never exported from Kaggle into this project. This is a good talking point about
   critical evaluation of ML results, not just a limitation to hide.

## Files changed/added

**Backend build (session 1)** — nothing in `fake_news_final_package/` or
`fake_news_model_handoff/` was modified or deleted:
- `backend/` (config.py, inference.py, explain.py, main.py, `__init__.py`)
- `tests/` (test_inference.py, test_api.py)
- `requirements.txt`, `README.md` (this file), `LABEL_MAPPING_VERIFICATION.md`

**Frontend redesign (session 2)** — presentation-only; `backend/` was re-verified
byte-for-byte unchanged (SHA-256 checksums matched before/after) and no API contract,
request/response shape, or inference/SHAP logic was touched:
- Replaced `frontend/index.html`, `frontend/style.css`, `frontend/app.js` (single-page) with
  a multi-page app: `frontend/index.html` (shell), `frontend/css/` (tokens.css, app.css),
  `frontend/js/` (main.js, router.js, api.js, components.js, charts.js, icons.js, storage.js,
  `pages/` — one module per page).
- Added `frontend/data/deberta_metrics.json` and `frontend/data/tfidf_baseline.json` — static
  copies of already-existing saved evaluation results, used by Model Comparison/Evaluation
  pages. No new backend endpoint was added to serve these; they're plain static files.

**Visual system rework (session 3)** — monochrome + selective glassmorphism, applied against
the `frontend-design-direction` skill (github.com/affaan-m/ECC). Still presentation-only;
`backend/` re-verified byte-for-byte unchanged again:
- Rewrote `frontend/css/tokens.css` and `frontend/css/app.css`: pure black/white palette (no
  hue anywhere, by explicit instruction), `backdrop-filter` glass applied only to true overlay
  surfaces (sidebar, mobile topbar, banners) — flat solid cards everywhere else so dense data
  stays scannable. Real/Fake is now carried by fill-weight (solid vs. outline) + icon shape
  instead of color, across pills, probability bars, SHAP bars, token highlighting, and the
  confusion matrix.
- Removed the "Overview" marketing page; **Analyze Article is now the landing route**, with the
  live backend-status banner folded into it directly.
- `frontend/js/api.js`: fixed a real bug found during evidence capture — a network failure
  was surfacing the browser's raw `"Failed to fetch"` string instead of an actionable message.
- Added `frontend/DESIGN_CONTRACT.md` (the direction + content-state table the skill requires)
  and `frontend/evidence/` (a checkable evidence record: `report.json`, `screenshots/` at
  `1440x900` and `390x844` covering empty/loading/success/error/partial states, and a vendored
  copy of the skill's `check-evidence.js` checker — passes clean: `node
  frontend/evidence/check-evidence.js frontend/evidence/report.json`).

## Known limitations / remaining issues

1. **Label mapping is empirically inferred, not confirmed from source.** See
   `LABEL_MAPPING_VERIFICATION.md`. If you can check your Kaggle notebook's label-assignment
   line, do that to get full certainty.
2. **Duplicate/near-duplicate leakage across train/val/test was not checked** — the raw
   WELFake rows and split assignment used for training aren't in this project. Exact next
   step is documented in `LABEL_MAPPING_VERIFICATION.md` §4.
3. **SHAP explanations are truncated to the first ~700 characters** of the combined
   title+body (`backend/config.py: SHAP_MAX_CHARS`) to keep CPU latency to roughly 15-30
   seconds. Longer articles are explained only up to that point; the UI tells you when this
   happens.
4. **No persistence/database** — this is a stateless prediction service by design, matching
   the original brief (no retraining, no new storage requirements).
5. **CPU-only inference** was what was tested here; if a GPU is available `torch.cuda.is_available()`
   is already checked and used automatically in `backend/inference.py`.
6. The TF-IDF + Logistic Regression baseline (`fake_news_final_package/results/tfidf_baseline.joblib`)
   is not wired into the app — the brief only asked to preserve/report it, not integrate it.
7. **Analysis History is browser-local only** (`localStorage`), not server-persisted — it does
   not sync across devices or browsers and is lost if site data is cleared. This is disclosed
   in-app on the History page rather than presented as real persistence.
8. **TF-IDF baseline metrics are incomplete by design.** Only a validation-accuracy figure
   (reported in the original project brief, ~95.63%) was available; no saved precision/recall/F1
   file for that baseline was found in this project, so Model Comparison shows those cells as
   "Not available" rather than inventing numbers.
