
Explainable AI-Based Fake News Detection System

Main model: fine-tuned microsoft/deberta-v3-base
Baseline: TF-IDF + Logistic Regression

Provisional held-out test metrics:
Accuracy: 0.9981
Macro precision: 0.9981
Macro recall: 0.9981
Macro F1: 0.9981

Important:
- Verify dataset label mapping before naming classes Fake or Real.
- Verify near-duplicate leakage and dataset artifacts before claiming
  real-world generalization.
- See results/ for evaluation outputs and SHAP explanations.
