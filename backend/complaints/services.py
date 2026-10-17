import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from civicai_finalyearproject import config as cfg, priority

from .models import Complaint, DuplicateLink

log = logging.getLogger(__name__)


def preload_models():
    """Load the three AI models once, so the first request is not slow."""
    from civicai_finalyearproject import model_loader

    for name, loader in (
        ("category", model_loader.get_text_model),
        ("urgency", model_loader.get_urgency_model),
        ("image", model_loader.get_image_model),
    ):
        try:
            loader()
            log.info("Loaded %s model", name)
        except FileNotFoundError as exc:
            log.warning("Could not preload %s model: %s", name, exc)


def _existing_for_engine(now):
    """Recent, unresolved complaints with a location, in the format the engine expects."""
    since = now - timedelta(hours=cfg.DUPLICATE_WINDOW_HOURS)
    queryset = (
        Complaint.objects.filter(created_at__gte=since, lat__isnull=False, lon__isnull=False)
        .exclude(status=Complaint.Status.RESOLVED)
    )
    return [
        {
            "id": c.id,
            "description": c.description,
            "department": c.department,
            "lat": c.lat,
            "lon": c.lon,
            "timestamp": c.created_at,
            "image_path": c.image.path if c.image else None,
            "status": c.status,
        }
        for c in queryset
    ]


def submit_complaint(description, image, lat, lon, location_type):
    """Run the engine on a new complaint, save it, and update the complaints it duplicates."""
    from civicai_finalyearproject import engine

    now = timezone.now()
    result = engine.process_complaint(
        text=description,
        image=image,
        lat=lat,
        lon=lon,
        location_type=location_type or None,
        timestamp=now,
        existing_complaints=_existing_for_engine(now),
    )

    if image is not None:
        image.seek(0)          # the engine has already read the upload

    with transaction.atomic():
        complaint = Complaint.objects.create(
            description=result["description"],
            image=image,
            lat=lat,
            lon=lon,
            location_type=location_type or "",
            created_at=now,
            category=result["category"] or "",
            department=result["department"],
            routing_source=result["routing_source"],
            needs_review=result["needs_review"],
            routing_reason=result["routing_reason"],
            urgency_level=result["urgency_level"],
            urgency_source=result["urgency_source"],
            base_score=result["base_score"],
            duplicate_count=result["duplicate_count"],
            priority_score=result["priority_score"],
            priority_level=result["priority_level"],
            text_prediction=result["text_prediction"],
            image_prediction=result["image_prediction"],
        )

        # Earlier reports of the same issue also become more urgent
        for match in result["duplicate_matches"]:
            DuplicateLink.objects.create(
                complaint=complaint,
                duplicate_of_id=match["id"],
                text_similarity=match["text_similarity"],
                distance_m=match["distance_m"],
                image_match=match["image_match"],
            )
            other = Complaint.objects.get(pk=match["id"])
            other.duplicate_count += 1
            other.priority_score = priority.compute_priority(other.base_score, other.duplicate_count)
            other.priority_level = priority.priority_level(other.priority_score)
            other.save(update_fields=["duplicate_count", "priority_score", "priority_level"])

    return complaint