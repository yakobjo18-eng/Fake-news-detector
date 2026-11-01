import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from backend import config
from backend.inference import ModelLoadError, load_model, predict_news


def test_model_and_tokenizer_load():
    model, tokenizer = load_model()
    assert model is not None
    assert tokenizer is not None


def test_predict_returns_valid_probabilities():
    result = predict_news("", "The city council approved the new budget on Tuesday after a 7-2 vote.")
    probs = result["probabilities"]
    p0, p1 = probs["class_0"], probs["class_1"]
    assert 0.0 <= p0 <= 1.0
    assert 0.0 <= p1 <= 1.0
    assert math.isfinite(p0) and math.isfinite(p1)
    assert abs((p0 + p1) - 1.0) < 1e-3
    assert result["predicted_class"] in (0, 1)
    assert result["label"] in ("Real", "Fake")


def test_empty_input_raises():
    with pytest.raises(ValueError):
        predict_news("", "")
    with pytest.raises(ValueError):
        predict_news("   ", "\n\t")


def test_label_mapping_matches_config():
    result = predict_news(
        "",
        "Reuters reported the central bank held interest rates steady at its policy meeting on Wednesday.",
    )
    assert result["label"] == config.ID2LABEL[result["predicted_class"]]
    assert result["label_mapping_verified"] is True


def test_fake_style_and_real_style_predict_different_classes():
    fake = predict_news(
        "",
        "SHOCKING: secret government documents prove vaccines contain mind control microchips, insider reveals.",
    )
    real = predict_news(
        "",
        "The Department of Labor reported the unemployment rate held steady at 4.1 percent in September.",
    )
    assert fake["predicted_class"] != real["predicted_class"]
