# Model notes

## Architecture
- Base model: `microsoft/deberta-v3-base`
- Fine-tuned for two-class classification on the WELFake dataset.
- Maximum token length used in inference: 256.

## Reported evaluation (provisional)
- Test accuracy: 0.9981
- Test macro precision: 0.9981
- Test macro recall: 0.9981
- Test macro F1: 0.9981
- Test examples: 6,368
- Confusion matrix (rows = actual class 0/1, columns = predicted class 0/1):
  `[[3474, 5], [7, 2882]]`

These figures were provided from the user's notebook. Because performance is unusually high,
verify near-duplicates and dataset artifacts before making generalization claims.

## Explainability outputs created in Kaggle
- `fake_news_results/shap_example.html`
- `fake_news_results/shap_global_importance.png`
- `fake_news_results/shap_global_importance_clean.png`
- `fake_news_results/test_metrics.json`
- `fake_news_results/classification_report.csv`
- `fake_news_results/confusion_matrix.csv`

Copy these outputs separately from Kaggle if you want them included in the app or report.

## Label mapping
Do not assume class 0 is fake or real until the WELFake dataset label convention is verified.
