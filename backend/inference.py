"""
Inference helper for the fine-tuned DeBERTa fake-news classifier.

Adapted from the handoff `predict.py`, pointed at the actual checkpoint location
(`fake_news_final_package/deberta_model`) and extended with the verified label mapping
from `config.py`. The model and tokenizer are loaded once and reused across requests.
"""
from typing import Any, Dict

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from . import config

_tokenizer = None
_model = None
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class ModelLoadError(RuntimeError):
    pass


def load_model():
    """Load tokenizer and model once; subsequent calls reuse the cached instances."""
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        if not config.MODEL_DIR.exists():
            raise ModelLoadError(
                f"Model directory not found: {config.MODEL_DIR}. "
                "Set FAKE_NEWS_MODEL_DIR or place the checkpoint at the default location."
            )
        try:
            _tokenizer = AutoTokenizer.from_pretrained(str(config.MODEL_DIR))
            _model = AutoModelForSequenceClassification.from_pretrained(
                str(config.MODEL_DIR), torch_dtype=torch.float32
            ).to(_device)
            _model.eval()
        except Exception as exc:
            raise ModelLoadError(f"Failed to load model/tokenizer from {config.MODEL_DIR}: {exc}") from exc
    return _model, _tokenizer


def is_loaded() -> bool:
    return _model is not None and _tokenizer is not None


def build_input_text(title: str, body: str) -> str:
    title = (title or "").strip()
    body = (body or "").strip()
    if title and body:
        return f"{title}\n{body}"
    return title or body


def predict_news(title: str, body: str) -> Dict[str, Any]:
    """
    Run inference on a news title and/or body.

    Returns predicted class id, the verified human-readable label, and class probabilities.
    Raises ValueError for empty/invalid input.
    """
    text = build_input_text(title, body)
    if not text:
        raise ValueError("Please provide a title and/or body text.")

    model, tokenizer = load_model()
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=config.MAX_LENGTH,
        padding=True,
    ).to(_device)

    with torch.inference_mode():
        logits = model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1)[0].cpu().tolist()

    predicted_class = int(max(range(len(probabilities)), key=probabilities.__getitem__))

    return {
        "predicted_class": predicted_class,
        "label": config.ID2LABEL.get(predicted_class, f"Class {predicted_class}"),
        "label_mapping_verified": config.LABEL_MAPPING_VERIFIED,
        "label_mapping_method": config.LABEL_MAPPING_METHOD,
        "probabilities": {
            "class_0": float(probabilities[0]),
            "class_1": float(probabilities[1]),
            config.ID2LABEL.get(0, "class_0").lower(): float(probabilities[0]),
            config.ID2LABEL.get(1, "class_1").lower(): float(probabilities[1]),
        },
        "confidence": float(max(probabilities)),
        "device": str(_device),
        "used_text_char_count": len(text),
    }
