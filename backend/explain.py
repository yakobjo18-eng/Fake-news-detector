"""
SHAP explainability for the DeBERTa fake-news classifier.

Kept separate from prediction because it is far more expensive (many forward passes
per explanation). Input is truncated and the SHAP evaluation budget is capped so a
request completes in roughly 15-30 seconds on CPU; failures are caught so a broken
explanation never breaks the underlying prediction.
"""
from typing import Any, Dict, List

import numpy as np
import shap
import torch

from . import config
from .inference import build_input_text, load_model, _device


class ExplanationError(RuntimeError):
    pass


_explainer = None


def _predict_proba(texts: List[str]) -> np.ndarray:
    model, tokenizer = load_model()
    inputs = tokenizer(
        list(texts),
        return_tensors="pt",
        truncation=True,
        max_length=config.MAX_LENGTH,
        padding=True,
    ).to(_device)
    with torch.inference_mode():
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1).cpu().numpy()
    return probs


def _get_explainer():
    global _explainer
    if _explainer is None:
        _, tokenizer = load_model()
        masker = shap.maskers.Text(tokenizer)
        _explainer = shap.Explainer(_predict_proba, masker)
    return _explainer


def explain_news(title: str, body: str, predicted_class: int) -> Dict[str, Any]:
    """
    Return per-token SHAP contributions toward the predicted class for a title/body pair.

    Raises ExplanationError on failure so callers can degrade gracefully without
    breaking the prediction response.
    """
    text = build_input_text(title, body)
    if not text:
        raise ExplanationError("No text to explain.")

    truncated = text[: config.SHAP_MAX_CHARS]
    was_truncated = len(text) > config.SHAP_MAX_CHARS

    try:
        explainer = _get_explainer()
        shap_values = explainer([truncated], max_evals=config.SHAP_MAX_EVALS)
    except Exception as exc:
        raise ExplanationError(f"SHAP explanation failed: {exc}") from exc

    tokens = list(shap_values.data[0])
    class_values = shap_values.values[0, :, predicted_class].tolist()

    contributions = [
        {"token": tok, "contribution": float(val)}
        for tok, val in zip(tokens, class_values)
        if tok.strip()
    ]
    contributions.sort(key=lambda c: abs(c["contribution"]), reverse=True)

    return {
        "explained_class": predicted_class,
        "explained_label": config.ID2LABEL.get(predicted_class, f"Class {predicted_class}"),
        "text_truncated": was_truncated,
        "explained_char_count": len(truncated),
        "top_contributions": contributions[:20],
        "all_tokens": [
            {"token": tok, "contribution": float(val)}
            for tok, val in zip(tokens, class_values)
        ],
        "disclaimer": (
            "These scores show which words most influenced THIS model's prediction for "
            "THIS article. They do not prove the article is factually true or false."
        ),
    }
