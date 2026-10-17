from rest_framework import serializers

from .models import Complaint, DuplicateLink


class ComplaintCreateSerializer(serializers.Serializer):
    description = serializers.CharField(required=False, allow_blank=True)
    image = serializers.ImageField(required=False)
    lat = serializers.FloatField(required=False, allow_null=True, min_value=-90, max_value=90)
    lon = serializers.FloatField(required=False, allow_null=True, min_value=-180, max_value=180)
    location_type = serializers.CharField(required=False, allow_blank=True, max_length=50)

    def validate(self, data):
        if not data.get("description", "").strip() and not data.get("image"):
            raise serializers.ValidationError("Provide a description, an image, or both.")
        return data


class DuplicateLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DuplicateLink
        fields = ["duplicate_of", "text_similarity", "distance_m", "image_match"]


class ComplaintSerializer(serializers.ModelSerializer):
    duplicate_matches = DuplicateLinkSerializer(source="duplicate_links", many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "description", "image", "lat", "lon", "location_type", "created_at", "status",
            "category", "department", "routing_source", "needs_review", "routing_reason",
            "urgency_level", "urgency_source", "base_score",
            "duplicate_count", "duplicate_matches", "priority_score", "priority_level",
            "text_prediction", "image_prediction",
        ]


class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Complaint.Status.choices)