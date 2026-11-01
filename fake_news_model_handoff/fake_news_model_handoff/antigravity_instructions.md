# Instructions for Antigravity

Build the app around the existing model; do not retrain it.

## Model integration
1. Use `predict.py` as the inference helper.
2. Copy the entire Hugging Face checkpoint directory from Kaggle:
   `/kaggle/working/best_deberta_fake_news/`
   into the project as `best_deberta_fake_news/`.
3. Install `requirements.txt`.
4. Call `predict_news(article_text)` from the backend. Load the model once at server startup or on first request, not for every request.
5. Return `predicted_class`, `class_0_probability`, and `class_1_probability` from the API.
6. Do not display the classes as "Fake" or "Real" until label mapping is verified.
7. Add input validation for empty text and handle model-loading/inference errors.

## SHAP
The notebook already generated a local SHAP HTML explanation and global importance charts.
Initially link or display the saved explanation artifacts as static assets. If implementing SHAP for
arbitrary user-submitted articles, use the same fine-tuned checkpoint and explain its output
probabilities. Keep SHAP computation separate from the normal prediction request because it is
more expensive.

## Reliability
- Treat reported 99.81% test accuracy as provisional pending near-duplicate/artifact checks.
- Do not claim explanations prove factual truth; SHAP explains model behavior only.
- Do not retrain the model as part of app startup.
- Add a test that confirms probability values are between 0 and 1 and sum to approximately 1.
