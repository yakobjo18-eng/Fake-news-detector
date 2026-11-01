"""
FastAPI backend for the Explainable AI-Based Fake News Detection System.

Serves the static frontend and two JSON endpoints:
    POST /api/predict  -> class prediction + probabilities
    POST /api/explain  -> SHAP word-level explanation for a prediction

The model is loaded once, at startup, and reused for every request.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import config
from .explain import ExplanationError, explain_news
from .inference import ModelLoadError, is_loaded, load_model, predict_news

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fake_news_app")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        load_model()
        logger.info("Model loaded successfully from %s", config.MODEL_DIR)
    except ModelLoadError as exc:
        # Do not crash the app; /api/health and endpoints will report the problem clearly.
        logger.error("Model failed to load at startup: %s", exc)
    yield


app = FastAPI(title="Explainable Fake News Detection", lifespan=lifespan)


class PredictRequest(BaseModel):
    title: str = Field(default="", max_length=10000)
    body: str = Field(default="", max_length=20000)


class ExplainRequest(BaseModel):
    title: str = Field(default="", max_length=10000)
    body: str = Field(default="", max_length=20000)


@app.get("/api/health")
def health():
    return {
        "model_loaded": is_loaded(),
        "model_dir": str(config.MODEL_DIR),
        "label_mapping_verified": config.LABEL_MAPPING_VERIFIED,
        "label_mapping_method": config.LABEL_MAPPING_METHOD,
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    if not req.title.strip() and not req.body.strip():
        raise HTTPException(status_code=400, detail="Please provide a title and/or body text.")
    try:
        result = predict_news(req.title, req.body)
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")
    return result


@app.post("/api/explain")
def explain(req: ExplainRequest):
    if not req.title.strip() and not req.body.strip():
        raise HTTPException(status_code=400, detail="Please provide a title and/or body text.")
    try:
        prediction = predict_news(req.title, req.body)
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        explanation = explain_news(req.title, req.body, prediction["predicted_class"])
    except ExplanationError as exc:
        # Explanation failures never take down the prediction itself.
        return {"prediction": prediction, "explanation": None, "explanation_error": str(exc)}

    return {"prediction": prediction, "explanation": explanation, "explanation_error": None}


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
