import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_loaded"] is True
    assert data["label_mapping_verified"] is True


def test_predict_valid_input(client):
    resp = client.post("/api/predict", json={"title": "", "body": "The mayor signed the new ordinance on Monday."})
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_class"] in (0, 1)
    assert data["label"] in ("Real", "Fake")
    p0, p1 = data["probabilities"]["class_0"], data["probabilities"]["class_1"]
    assert abs((p0 + p1) - 1.0) < 1e-3


def test_predict_empty_input_returns_400(client):
    resp = client.post("/api/predict", json={"title": "", "body": ""})
    assert resp.status_code == 400


def test_explain_graceful_structure(client):
    resp = client.post(
        "/api/explain",
        json={"title": "", "body": "Scientists confirm new vaccine side effects conspiracy spreading online."},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "prediction" in data
    assert "explanation" in data
    assert "explanation_error" in data
    if data["explanation_error"] is None:
        assert "top_contributions" in data["explanation"]
