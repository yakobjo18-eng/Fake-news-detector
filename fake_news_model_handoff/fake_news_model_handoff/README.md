# Explainable AI-Based Fake News Detection — Model Handoff

## Contents
- `predict.py`: reusable inference function for the fine-tuned DeBERTa checkpoint.
- `requirements.txt`: Python dependencies.
- `antigravity_instructions.md`: instructions for integrating the model into an app.
- `MODEL_NOTES.md`: metrics, known caveats, and expected integration behavior.

## Required model files
Copy the contents of your Kaggle checkpoint folder `/kaggle/working/best_deberta_fake_news/`
into a folder named `best_deberta_fake_news/` alongside `predict.py`. This checkpoint is not
included in this handoff ZIP because it lives in your Kaggle environment.

The model directory should contain files such as `config.json`, model weight shards/index files,
and tokenizer files.

## Quick start
1. Copy `best_deberta_fake_news/` from Kaggle into this project directory.
2. Install dependencies: `pip install -r requirements.txt`
3. Use `predict_news("your article text here")` from `predict.py`.

## Important
The class-to-label mapping (whether 0 is fake or real) has not yet been verified against the
dataset's official documentation. Do not display Fake/Real labels until this is confirmed.
The 99.81% test accuracy is the user's reported result; treat it as provisional until
near-duplicate leakage and dataset artifacts have been investigated.
