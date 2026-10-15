"""Priority: base urgency score + capped boost for duplicate reports."""
import json
import os

from . import config as cfg

LEVELS = ["low", "medium", "high"]

# Used only if urgency_stats.json has not been created yet
DEFAULT_STATS = {
    "level_base_score": {"low": 2.0, "medium": 5.0, "high": 8.0},
    "category_default": {},
}


def load_stats(path: str = None) -> dict:
    """Load the score statistics saved by the urgency notebook."""
    path = path or cfg.URGENCY_STATS_PATH
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return DEFAULT_STATS


def expected_base_score(level_probs: dict, stats: dict) -> float:
    """
    Probability-weighted base score, e.g. 60% medium + 40% high gives a score between
    the two. This ranks complaints more smoothly than using only the top class.
    """
    base = stats["level_base_score"]
    return round(sum(level_probs.get(level, 0.0) * base[level] for level in LEVELS), 2)


def default_urgency_for_category(category, stats: dict):
    """Typical (level, score) for a category. Used when a complaint has no text."""
    fallback = ("medium", stats["level_base_score"]["medium"])
    if not category:
        return fallback
    defaults = stats.get("category_default", {})
    key = str(category).lower()
    if key in defaults:
        return defaults[key]["level"], defaults[key]["score"]
    for name, entry in defaults.items():       # loose match, e.g. "garbage" vs "domestic_garbage"
        if key in name.lower() or name.lower() in key:
            return entry["level"], entry["score"]
    return fallback


def duplicate_boost(duplicate_count: int) -> float:
    return min(duplicate_count * cfg.DUPLICATE_BOOST, cfg.MAX_DUPLICATE_BOOST)


def compute_priority(base_score: float, duplicate_count: int) -> float:
    """Final priority = base urgency + capped duplicate boost, limited to MAX_PRIORITY_SCORE."""
    return round(min(base_score + duplicate_boost(duplicate_count), cfg.MAX_PRIORITY_SCORE), 2)


def priority_level(score: float) -> str:
    for threshold, name in cfg.PRIORITY_LEVELS:
        if score >= threshold:
            return name
    return "low"