"""Routing: map model labels to departments and decide which model to trust."""
from dataclasses import dataclass, asdict
from typing import Optional

from . import config as cfg

DEPT_WASTE = "Solid Waste Management"
DEPT_ROADS = "Roads Department"
DEPT_TRAFFIC = "Traffic Police"
DEPT_PUBLIC_WORKS = "Public Works"
DEPT_DRAINAGE = "Drainage & Sewerage"
DEPT_WARD = "Ward / Municipal Office"
UNASSIGNED = "Unassigned (needs review)"

# Ordered rules: the first keyword found in the label decides the department.
DEPARTMENT_RULES = [
    (DEPT_DRAINAGE, ("drain", "sewer", "sewage", "manhole")),
    (DEPT_TRAFFIC, ("parking",)),
    (DEPT_ROADS, ("pothole", "sign", "road")),
    (DEPT_WARD, ("vandal", "graffiti")),
    (DEPT_PUBLIC_WORKS, ("infrastructure", "concrete")),
    (DEPT_WASTE, ("trash", "garbage", "waste")),
]

# Used when an image-only complaint needs a typical urgency from the text-category statistics
IMAGE_TO_TEXT_CATEGORY = {
    "Garbage_Waste_Trash": "garbage",
    "Infrastructure_Damage_Concrete": "infrastructure",
    "Parking_Issues_Illegal_Parking": "illegal_parking",
    "Road_Issues_Damaged_Sign": "road_damaged_sign",
    "Road_Issues_Pothole": "pothole",
    "Vandalism_Graffiti": "vandalism",
}


def department_for_label(label: Optional[str]) -> str:
    """Return the department that handles a text or image label."""
    if not label:
        return UNASSIGNED
    key = str(label).lower()
    for department, keywords in DEPARTMENT_RULES:
        if any(k in key for k in keywords):
            return department
    return UNASSIGNED


def to_text_category(label: Optional[str]) -> Optional[str]:
    """Translate an image class name into the text-dataset category name."""
    if label is None:
        return None
    return IMAGE_TO_TEXT_CATEGORY.get(label, label)


def mapping_table(labels):
    """List of (label, department) pairs, handy for checking the rules."""
    return [(label, department_for_label(label)) for label in labels]


@dataclass
class RoutingDecision:
    category: Optional[str]
    department: str
    source: str            # image | text | text_fallback | image_low_confidence | none
    needs_review: bool
    reason: str

    def as_dict(self):
        return asdict(self)


def route(text_pred=None, image_pred=None,
          image_threshold=cfg.IMAGE_CONFIDENCE_THRESHOLD,
          text_threshold=cfg.TEXT_CONFIDENCE_THRESHOLD) -> RoutingDecision:
    """
    Image-first routing with text fallback.

    text_pred / image_pred: {"label": str, "confidence": float} or None.
    """
    image_ok = image_pred is not None and image_pred["confidence"] >= image_threshold
    text_ok = text_pred is not None and text_pred["confidence"] >= text_threshold

    # 1) Confident image: route by the image
    if image_ok:
        img_dept = department_for_label(image_pred["label"])
        if text_ok:
            txt_dept = department_for_label(text_pred["label"])
            if txt_dept != img_dept:
                return RoutingDecision(
                    image_pred["label"], img_dept, "image", True,
                    f"Text suggests {txt_dept}, image suggests {img_dept}",
                )
        return RoutingDecision(image_pred["label"], img_dept, "image", False, "Confident image prediction")

    # 2) No usable image: fall back to the text
    if text_pred is not None:
        dept = department_for_label(text_pred["label"])
        if image_pred is not None:
            source, reason = "text_fallback", "Image confidence too low, used text"
        else:
            source, reason = "text", "No image provided, used text"
        if not text_ok:
            reason += "; text confidence is low"
        return RoutingDecision(text_pred["label"], dept, source, not text_ok, reason)

    # 3) Only a weak image prediction exists
    if image_pred is not None:
        return RoutingDecision(
            image_pred["label"], department_for_label(image_pred["label"]),
            "image_low_confidence", True, "Only a low-confidence image prediction is available",
        )

    # 4) Nothing to route on
    return RoutingDecision(None, UNASSIGNED, "none", True, "No text or image provided")