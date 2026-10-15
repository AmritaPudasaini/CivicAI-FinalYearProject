"""The complaint engine: one function that turns a submission into a routed, prioritised record."""
import os
from datetime import datetime

from PIL import Image

from . import duplicates, model_loader, priority, routing


def _to_pil(image):
    """Accept a path, an uploaded file object, or a PIL image; return a PIL image (or None)."""
    if image is None:
        return None
    if isinstance(image, Image.Image):
        return image
    if hasattr(image, "seek"):           # uploaded file objects: rewind before reading
        image.seek(0)
    return Image.open(image).convert("RGB")


def analyze(text=None, image=None, location_type=None) -> dict:
    """Model predictions plus the routing decision. Does not check duplicates or compute priority."""
    text = (text or "").strip()
    image = _to_pil(image)
    if not text and image is None:
        raise ValueError("Provide a description, an image, or both.")

    text_pred = model_loader.predict_text(text) if text else None
    image_pred = model_loader.predict_image(image) if image is not None else None
    urgency_pred = model_loader.predict_urgency(text, location_type) if text else None

    return {
        "text_pred": text_pred,
        "image_pred": image_pred,
        "urgency_pred": urgency_pred,
        "routing": routing.route(text_pred, image_pred),
    }


def process_complaint(text=None, image=None, lat=None, lon=None, location_type=None,
                      timestamp=None, existing_complaints=None, complaint_id=None) -> dict:
    """
    Full pipeline: classify, route, estimate urgency, find duplicates, compute priority.

    The returned dict also works as a stored record: append it to the existing-complaints
    list (or save it to the database) so later complaints can be compared against it.
    """
    timestamp = timestamp or datetime.now()
    text = (text or "").strip()
    image_path = str(image) if isinstance(image, (str, os.PathLike)) else None
    image = _to_pil(image)

    analysis = analyze(text, image, location_type)
    decision = analysis["routing"]
    urgency_pred = analysis["urgency_pred"]
    stats = priority.load_stats()

    # Urgency: from the urgency model when there is text, otherwise a typical value for the category
    if urgency_pred is not None:
        urgency_level = urgency_pred["label"]
        base_score = priority.expected_base_score(urgency_pred["probs"], stats)
        urgency_source = "urgency_model"
    else:
        urgency_level, base_score = priority.default_urgency_for_category(
            routing.to_text_category(decision.category), stats
        )
        urgency_source = "category_default"

    # Duplicates
    new_record = {
        "description": text, "department": decision.department,
        "lat": lat, "lon": lon, "timestamp": timestamp, "image": image,
    }
    matches = duplicates.find_duplicates(new_record, existing_complaints or [])
    duplicate_count = len(matches)

    score = priority.compute_priority(base_score, duplicate_count)

    return {
        "id": complaint_id,
        "description": text,
        "image_path": image_path,
        "lat": lat, "lon": lon, "location_type": location_type,
        "timestamp": timestamp,
        "status": "open",

        "category": decision.category,
        "department": decision.department,
        "routing_source": decision.source,
        "needs_review": decision.needs_review,
        "routing_reason": decision.reason,

        "urgency_level": urgency_level,
        "urgency_source": urgency_source,
        "base_score": base_score,

        "duplicate_count": duplicate_count,
        "duplicate_matches": matches,
        "priority_score": score,
        "priority_level": priority.priority_level(score),

        "text_prediction": analysis["text_pred"],
        "image_prediction": analysis["image_pred"],
    }