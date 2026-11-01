# Label Mapping & Reliability Verification

This document records what was actually checked for Task 1 of the project brief, what the
results were, and — critically — what could **not** be checked locally and why.

## 1. What was available to inspect

Only the following were present in the project directory:
- `fake_news_final_package/deberta_model/` — the trained checkpoint (`config.json`,
  `model.safetensors`, tokenizer files).
- `fake_news_final_package/results/` — `test_metrics.json`, `classification_report.csv`,
  `confusion_matrix.csv`, a SHAP example HTML, SHAP global-importance images, and a saved
  TF-IDF baseline.
- Handoff docs (`MODEL_NOTES.md`, `README.md`, `antigravity_instructions.md`, `predict.py`).

**Not present**: the Kaggle training notebook, the raw WELFake CSV, or the exact
train/validation/test split files/indices used to produce the reported metrics.

This matters: several of the checks requested in Task 1 (duplicate/leakage detection across
the *actual* splits used) are only possible with the real split data, which was not provided.
Those checks are reported as **not performed**, below, rather than guessed at.

## 2. Model/tokenizer load and inference — VERIFIED

Ran directly against `fake_news_final_package/deberta_model`:
- Tokenizer (`DebertaV2Tokenizer`) and model (`DebertaV2ForSequenceClassification`,
  `num_labels=2`) load successfully with `transformers` 5.20.1 / `torch` 2.10.0 (CPU).
- Forward pass produces finite 2-class softmax probabilities summing to 1.0 (see
  `tests/test_inference.py::test_predict_returns_valid_probabilities`, passing).

## 3. Label mapping — EMPIRICALLY VERIFIED (not from original training code)

`config.json` contains **no** real `id2label`/`label2id` — only the generic placeholders
`{0: "LABEL_0", 1: "LABEL_1"}`. The handoff docs explicitly flagged the mapping as
unconfirmed. Two independent sources of evidence were used:

**a) Official WELFake dataset documentation** (Zenodo record 4561253, the canonical
source for this dataset) states:
> label 0 = fake, label 1 = real

**b) Behavioral testing of the actual deployed checkpoint.** 20 unambiguous synthetic
headlines were run through the model directly (10 fabricated/conspiratorial-style, 10
factual/wire-style — see the sample texts in the git history of
`C:\Users\Yakob\AppData\Local\Temp\claude\...\scratchpad\test_label_mapping.py`, reproduced
below for traceability):

| Sample type | Predicted class 0 | Predicted class 1 |
|---|---|---|
| Fake-style (10 samples, e.g. "vaccines contain microchips", "moon landing staged", "miracle cancer cure") | 1 | 9 |
| Real-style (10 samples, e.g. Fed rate decisions, BLS jobs report, WHO guidance, court rulings) | 10 | 0 |

Confidence on the 19/20 consistent cases was >99% in nearly every case (softmax probability
for the winning class). The one exception (a "chocolate cures cancer" sample predicted as
class 0) is a borderline case — it reads as an absurd claim but is phrased like a human-
interest story, not an institutional claim, so it is not strong counter-evidence.

**Result: this contradicts the official WELFake label convention.** The behavioral evidence
says, for *this specific trained checkpoint*: **0 = Real, 1 = Fake**. The most likely
explanation is that the training notebook relabeled the column at some point (a common step,
since other popular fake-news datasets use the opposite convention) — but that notebook was
not available to confirm this directly.

**Decision made for the app**: use the empirically observed mapping (`0 = Real`, `1 = Fake`),
because the app must reflect what the deployed model actually does, not what the dataset
card says a model built on it *should* do. This is documented in `backend/config.py` as
`LABEL_MAPPING_METHOD = "empirical_behavioral_test"`, and every prediction response includes
`label_mapping_verified` / `label_mapping_method` fields so this is never silently asserted
as ground truth.

**If you want to close this out with certainty**: open your Kaggle notebook and check how the
`label` column was assigned before training (e.g. search for `df['label']`, `1 - df['label']`,
or a `LabelEncoder` call). That single line of training code is the authoritative answer.

## 4. The 99.81% reported test accuracy — NOT RE-VERIFIED, reliability concerns documented

- `test_metrics.json` / `classification_report.csv` / `confusion_matrix.csv` are the
  **pre-computed outputs** copied from the Kaggle notebook. They were inspected and are
  internally consistent (confusion matrix sums to 6,368, matches reported accuracy/F1 exactly).
- They were **not recomputed** here because the raw test split (the actual text rows and
  labels used for that run) is not present in this project — only the aggregate numbers are.
  Recomputing would require re-running the held-out set through the model, which needs the
  original split file.
- **Exact and near-duplicate / leakage checks across train/val/test — NOT PERFORMED.**
  This requires the raw WELFake rows and the split assignment, neither of which exists in
  this project directory. This is reported honestly as **not checked**, not as "passed."

### Why the 99.81% figure deserves skepticism (context, not proof)
- WELFake's own Zenodo record notes a gap between 78,098 raw CSV rows and 72,134 rows actually
  usable in a dataframe — consistent with, but not proof of, duplicate/malformed rows having
  been dropped somewhere in standard preprocessing.
- A web search turned up no specific published audit confirming duplicate leakage in WELFake
  specifically (searched 2026-10-25); this is an open question in the literature, not a
  confirmed defect.
- 99.8% accuracy with an almost-balanced, very low error count (12 errors out of 6,368) is
  unusually high for a general-purpose fake-news classifier and is a known pattern associated
  with train/test leakage or dataset-specific shortcuts (e.g. source/formatting artifacts that
  correlate with the label but wouldn't generalize to new, unseen articles).

### Exact next step to actually close this out
1. In the Kaggle notebook, export the train/validation/test dataframes (or at minimum their
   row indices + the `title`/`text`/`label` columns) to CSV.
2. Drop those files into this project (e.g. `data/train.csv`, `data/val.csv`, `data/test.csv`).
3. Run a duplicate-leakage script that: (a) exact-matches on normalized `text` across splits,
   (b) near-duplicate matches via a fast method (e.g. MinHash/shingling or TF-IDF cosine
   similarity above a threshold) across train vs. test, and (c) reports the overlap count and
   the accuracy recomputed after removing overlapping test rows.
4. I can write that script immediately once the split files are available — it does not exist
   yet because there is nothing to run it against.

## 5. Summary table

| Item | Status |
|---|---|
| Model/tokenizer load from local checkpoint | ✅ Verified (automated test passing) |
| Inference produces valid probabilities | ✅ Verified (automated test passing) |
| Label mapping (0=Real, 1=Fake) | ⚠️ Empirically verified against the deployed checkpoint; **contradicts** official WELFake dataset card; not confirmed against original training code |
| 99.81% reported accuracy | ⚠️ Internally consistent pre-computed numbers reviewed; not recomputed; near-duplicate/leakage audit not performed (raw split data unavailable) |
| Generalization to real-world unseen articles | ❓ Unknown — treat predictions as a model opinion, not a verified fact-check |
