"""
Inference helper for the fine-tuned DeBERTa fake-news classifier.

Place the exported `best_deberta_fake_news/` checkpoint directory beside this file.
"""
from pathlib import Path
from typing import Any, Dict, List, Union

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "best_deberta_fake_news"
MAX_LENGTH = 256

_tokenizer = None
_model = None
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_model():
    """Load tokenizer and model once; subsequent calls reuse them."""
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        if not MODEL_DIR.exists():
            raise FileNotFoundError(
                f"Model directory not found: {MODEL_DIR}. "
                "Copy your Kaggle checkpoint into this directory."
            )
        _tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
        _model = AutoModelForSequenceClassification.from_pretrained(
            str(MODEL_DIR), torch_dtype=torch.float32
        ).to(_device)
        _model.eval()
    return _model, _tokenizer


def predict_news(text: str) -> Dict[str, Any]:
    """
    Return class ID and probabilities.

    This intentionally returns class IDs, not Fake/Real labels, because the
    dataset's label mapping still needs confirmation.
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a non-empty string")

    model, tokenizer = load_model()
    inputs = tokenizer(
        text[:10000],
        return_tensors="pt",
        truncation=True,
        max_length=MAX_LENGTH,
        padding=True,
    ).to(_device)

    with torch.inference_mode():
        logits = model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1)[0].cpu().tolist()

    predicted_class = int(max(range(len(probabilities)), key=probabilities.__getitem__))
    return {
        "predicted_class": predicted_class,
        "class_0_probability": float(probabilities[0]),
        "class_1_probability": float(probabilities[1]),
        "device": str(_device),
        "model": "microsoft/deberta-v3-base-finetuned",
        "label_mapping_verified": False,
    }


if __name__ == "__main__":
    sample = input("Paste news text: ").strip()
    try:
        print(predict_news(sample))
    except Exception as exc:
        raise SystemExit(f"Prediction failed: {exc}")
