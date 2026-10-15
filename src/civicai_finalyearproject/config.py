"""Central place for paths and tunable thresholds."""
import os

# config.py lives in src/civicai_finalyearproject/, so the project root is two levels up
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

DATA_DIR = os.path.join(PROJECT_ROOT, "data")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")

# ---------------- Paths ----------------
TEXT_DATA_DIR = os.path.join(DATA_DIR, "text_dataset")
IMAGE_DATA_DIR = os.path.join(DATA_DIR, "CivicIssuesImageDataset")

CATEGORY_MODEL_DIR = os.path.join(MODELS_DIR, "muril_category_final")
URGENCY_MODEL_DIR = os.path.join(MODELS_DIR, "muril_urgency_final")      # created by MuRIL_urgency.ipynb
IMAGE_MODEL_PATH = os.path.join(MODELS_DIR, "efficientnet_b0_civic_final.pth")

# Saved by the urgency notebook, next to the urgency model
URGENCY_STATS_PATH = os.path.join(URGENCY_MODEL_DIR, "urgency_stats.json")
URGENCY_CONFIG_PATH = os.path.join(URGENCY_MODEL_DIR, "urgency_config.json")

# ---------------- Model settings ----------------
MAX_LENGTH = 128

# ---------------- Routing thresholds ----------------
IMAGE_CONFIDENCE_THRESHOLD = 0.80
TEXT_CONFIDENCE_THRESHOLD = 0.60

# ---------------- Duplicate detection ----------------
DUPLICATE_RADIUS_M = 100
DUPLICATE_WINDOW_HOURS = 72
TEXT_SIM_THRESHOLD = 0.45        # char n-gram TF-IDF cosine similarity
IMAGE_HASH_MAX_DISTANCE = 10     # perceptual-hash Hamming distance

# ---------------- Priority ----------------
DUPLICATE_BOOST = 1.5            # points added per duplicate report
MAX_DUPLICATE_BOOST = 5.0
MAX_PRIORITY_SCORE = 10.0
PRIORITY_LEVELS = [(9.0, "critical"), (7.0, "high"), (4.0, "medium"), (0.0, "low")]