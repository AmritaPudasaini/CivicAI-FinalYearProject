from django.conf import settings
from rest_framework import serializers

from .models import Complaint, DuplicateLink


class ComplaintCreateSerializer(serializers.Serializer):
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    image = serializers.ImageField(required=False)
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lon = serializers.FloatField(min_value=-180, max_value=180)
    location_type = serializers.CharField(required=False, allow_blank=True, max_length=50)

    def validate_image(self, value):
        max_bytes = int(settings.MAX_UPLOAD_MB * 1024 * 1024)
        if value.size > max_bytes:
            raise serializers.ValidationError(f"Image is too large (maximum {settings.MAX_UPLOAD_MB} MB).")
        if getattr(value, "content_type", None) not in settings.ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError("Only JPG, PNG or WebP images are accepted.")
        return value

    def validate(self, data):
        if not data.get("description", "").strip() and not data.get("image"):
            raise serializers.ValidationError("Provide a description, an image, or both.")
        return data


class PublicComplaintSerializer(serializers.ModelSerializer):
    """The limited view a citizen gets after submitting, and when tracking a complaint."""
    matched_existing_report = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = ["tracking_code", "status", "department", "priority_level",
                  "created_at", "matched_existing_report"]

    def get_matched_existing_report(self, obj):
        return obj.duplicate_links.exists()


class DuplicateLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DuplicateLink
        fields = ["duplicate_of", "text_similarity", "distance_m", "image_match"]


class ComplaintSerializer(serializers.ModelSerializer):
    """Full record, for staff only."""
    duplicate_matches = DuplicateLinkSerializer(source="duplicate_links", many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "tracking_code", "description", "image", "lat", "lon", "location_type",
            "created_at", "status",
            "category", "department", "routing_source", "needs_review", "routing_reason",
            "urgency_level", "urgency_source", "base_score",
            "duplicate_count", "duplicate_matches", "priority_score", "priority_level",
            "text_prediction", "image_prediction",
        ]


class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Complaint.Status.choices)