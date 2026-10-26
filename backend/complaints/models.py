import secrets

from django.db import models
from django.utils import timezone

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # no 0/O/1/I, to avoid mix-ups when read aloud


def generate_tracking_code():
    return "CV-" + "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))


class Complaint(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"

    # What the citizen submitted
    tracking_code = models.CharField(max_length=16, blank=True, db_index=True, editable=False)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="complaints/%Y/%m/", null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)
    location_type = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)

    # Routing
    category = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100)
    routing_source = models.CharField(max_length=30, blank=True)
    needs_review = models.BooleanField(default=False)
    routing_reason = models.CharField(max_length=255, blank=True)

    # Urgency and priority
    urgency_level = models.CharField(max_length=10)
    urgency_source = models.CharField(max_length=30, blank=True)
    base_score = models.FloatField(default=0)
    duplicate_count = models.PositiveIntegerField(default=0)
    priority_score = models.FloatField(default=0)
    priority_level = models.CharField(max_length=10)

    # Raw model outputs, kept for debugging and for the report
    text_prediction = models.JSONField(null=True, blank=True)
    image_prediction = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-priority_score", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            code = generate_tracking_code()
            while Complaint.objects.filter(tracking_code=code).exists():
                code = generate_tracking_code()
            self.tracking_code = code
            if kwargs.get("update_fields") is not None:        # make sure the new code is written too
                kwargs["update_fields"] = list(kwargs["update_fields"]) + ["tracking_code"]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.pk} {self.department} ({self.priority_level})"


class DuplicateLink(models.Model):
    """`complaint` was recognised as a duplicate of the earlier complaint `duplicate_of`."""
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="duplicate_links")
    duplicate_of = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="duplicated_by")
    text_similarity = models.FloatField(default=0)
    distance_m = models.FloatField(default=0)
    image_match = models.BooleanField(default=False)