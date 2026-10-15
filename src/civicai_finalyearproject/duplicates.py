"""Duplicate detection: same department + nearby + recent + similar text or image."""
import math
from datetime import timedelta, datetime

from PIL import Image
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from . import config as cfg

try:
    import imagehash
except ImportError:          # image matching is skipped if imagehash is not installed
    imagehash = None

CLOSED_STATUSES = {"resolved", "closed"}


def haversine_m(lat1, lon1, lat2, lon2) -> float:
    """Distance in metres between two latitude/longitude points."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def text_similarities(new_text: str, candidate_texts: list) -> list:
    """
    Cosine similarity between the new text and each candidate, using character n-grams.
    Character n-grams tolerate spelling variants of romanized Nepali (bigreko / bigriyeko).
    """
    if not new_text or not candidate_texts:
        return [0.0] * len(candidate_texts)
    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), lowercase=True)
    try:
        matrix = vectorizer.fit_transform([new_text] + list(candidate_texts))
    except ValueError:
        return [0.0] * len(candidate_texts)
    return cosine_similarity(matrix[0:1], matrix[1:])[0].tolist()


def _open_image(img):
    if isinstance(img, Image.Image):
        return img
    if hasattr(img, "seek"):          # uploaded file objects may already have been read
        img.seek(0)
    return Image.open(img)


def images_similar(img_a, img_b, max_distance: int = cfg.IMAGE_HASH_MAX_DISTANCE) -> bool:
    """Perceptual-hash comparison. Accepts file paths or PIL images; False if either is missing."""
    if imagehash is None or img_a is None or img_b is None:
        return False
    try:
        return (imagehash.phash(_open_image(img_a)) - imagehash.phash(_open_image(img_b))) <= max_distance
    except Exception:
        return False


def find_duplicates(new: dict, existing: list,
                    radius_m: float = cfg.DUPLICATE_RADIUS_M,
                    window_hours: float = cfg.DUPLICATE_WINDOW_HOURS,
                    text_threshold: float = cfg.TEXT_SIM_THRESHOLD) -> list:
    """
    new:      {"description", "department", "lat", "lon", "timestamp", "image"}
    existing: list of dicts with "id", "description", "department", "lat", "lon",
              "timestamp", "image_path", "status"
    Returns one dict per matching existing complaint.
    """
    if new.get("lat") is None or new.get("lon") is None:
        return []                                      # without a location, duplicates cannot be checked

    new_time = new.get("timestamp") or datetime.now()
    candidates = []
    for c in existing:
        if c.get("status") in CLOSED_STATUSES:
            continue
        if c.get("department") != new.get("department"):
            continue
        if c.get("lat") is None or c.get("lon") is None:
            continue
        if abs(new_time - c["timestamp"]) > timedelta(hours=window_hours):
            continue
        distance = haversine_m(new["lat"], new["lon"], c["lat"], c["lon"])
        if distance > radius_m:
            continue
        candidates.append((c, distance))

    if not candidates:
        return []

    sims = text_similarities(new.get("description", ""), [c.get("description") or "" for c, _ in candidates])

    matches = []
    for (c, distance), sim in zip(candidates, sims):
        text_match = sim >= text_threshold and bool(new.get("description")) and bool(c.get("description"))
        image_match = images_similar(new.get("image"), c.get("image_path"))
        if text_match or image_match:
            matches.append({
                "id": c.get("id"),
                "distance_m": round(distance, 1),
                "text_similarity": round(sim, 3),
                "image_match": image_match,
            })
    return matches