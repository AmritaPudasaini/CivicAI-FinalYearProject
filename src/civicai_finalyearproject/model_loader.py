"""Loads the three trained models lazily and exposes simple predict functions."""
import json
import os
from functools import lru_cache

import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from . import config as cfg


def _require(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}. Train/copy it first (see config.py).")


def _load_hf(path):
    _require(path)
    tokenizer = AutoTokenizer.from_pretrained(path)
    model = AutoModelForSequenceClassification.from_pretrained(path)
    model.eval()
    return tokenizer, model


@lru_cache(maxsize=1)
def get_text_model():
    return _load_hf(cfg.CATEGORY_MODEL_DIR)


@lru_cache(maxsize=1)
def get_urgency_model():
    tokenizer, model = _load_hf(cfg.URGENCY_MODEL_DIR)
    settings = {"use_location_type": False}
    if os.path.isfile(cfg.URGENCY_CONFIG_PATH):
        with open(cfg.URGENCY_CONFIG_PATH, encoding="utf-8") as f:
            settings = json.load(f)
    return tokenizer, model, settings


@lru_cache(maxsize=1)
def get_image_model():
    _require(cfg.IMAGE_MODEL_PATH)
    checkpoint = torch.load(cfg.IMAGE_MODEL_PATH, map_location="cpu", weights_only=True)
    class_names = checkpoint["class_names"]
    img_size = checkpoint["img_size"]

    model = efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(class_names))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return model, class_names, transform


def _summarise(label_probs: dict) -> dict:
    best = max(label_probs, key=label_probs.get)
    return {"label": best, "confidence": label_probs[best], "probs": label_probs}


def _predict_hf(tokenizer, model, text):
    inputs = tokenizer(text, return_tensors="pt", padding="max_length",
                       truncation=True, max_length=cfg.MAX_LENGTH)
    with torch.no_grad():
        probs = torch.softmax(model(**inputs).logits, dim=-1)[0]
    id2label = model.config.id2label
    return _summarise({id2label[i]: float(p) for i, p in enumerate(probs)})


def predict_text(text: str) -> dict:
    """Complaint category from the MuRIL category model."""
    tokenizer, model = get_text_model()
    return _predict_hf(tokenizer, model, text)


def predict_urgency(text: str, location_type: str = None) -> dict:
    """Urgency level (low / medium / high) from the MuRIL urgency model."""
    tokenizer, model, settings = get_urgency_model()
    if settings.get("use_location_type") and location_type:
        text = f"{location_type.strip()}: {text}"
    return _predict_hf(tokenizer, model, text)


def predict_image(image) -> dict:
    """Complaint category from EfficientNet-B0. `image` can be a path, PIL image, or uploaded file."""
    model, class_names, transform = get_image_model()
    img = image if isinstance(image, Image.Image) else Image.open(image)
    tensor = transform(img.convert("RGB")).unsqueeze(0)
    with torch.no_grad():
        probs = torch.softmax(model(tensor), dim=-1)[0]
    return _summarise({class_names[i]: float(p) for i, p in enumerate(probs)})