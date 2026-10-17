from django.db import models
from django.utils import timezone


class Complaint(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"

    # What the citizen submitted
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

    def __str__(self):
        return f"#{self.pk} {self.department} ({self.priority_level})"


class DuplicateLink(models.Model):
    """`complaint` was recognised as a duplicate of the earlier complaint `duplicate_of`."""
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="duplicate_links")
    duplicate_of = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="duplicated_by")
    text_similarity = models.FloatField(default=0)
    distance_m = models.FloatField(default=0)
    image_match = models.BooleanField(default=False)