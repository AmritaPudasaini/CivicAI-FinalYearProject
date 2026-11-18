from django.conf import settings
from rest_framework import serializers
import re

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from .models import Complaint, DuplicateLink, UserProfile

class CitizenInformationSerializer(serializers.ModelSerializer):
    """Registration information shown to authorized staff."""

    full_name = serializers.CharField(
        source="first_name",
        read_only=True,
    )
    phone_number = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    account_role = serializers.SerializerMethodField()
    phone_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "full_name",
            "email",
            "phone_number",
            "address",
            "date_joined",
            "account_role",
            "phone_verified",
        ]

    def get_phone_number(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.phone_number if profile else None

    def get_address(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.address if profile else ""

    def get_account_role(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.role if profile else None

    def get_phone_verified(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.is_phone_verified if profile else False

class CitizenRegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    address = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(username__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate_full_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Full name is required.")

        return value

    def validate_address(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Address is required.")

        return value

    def validate(self, data):
        password = data["password"]
        confirm_password = data["confirm_password"]

        if password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        password_rules = {
            "uppercase": r"[A-Z]",
            "lowercase": r"[a-z]",
            "digit": r"\d",
            "special character": r"[^A-Za-z0-9]",
        }

        for rule, pattern in password_rules.items():
            if not re.search(pattern, password):
                raise serializers.ValidationError({
                    "password": (
                        f"Password must contain at least one {rule}."
                    )
                })

        temporary_user = User(
            username=data["email"],
            email=data["email"],
            first_name=data["full_name"],
        )

        try:
            validate_password(password, user=temporary_user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({
                "password": list(exc.messages)
            })

        return data

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("confirm_password")

        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            first_name=validated_data["full_name"],
            password=validated_data["password"],
        )

        UserProfile.objects.create(
            user=user,
            role=UserProfile.Role.CITIZEN,
            address=validated_data["address"],
            is_phone_verified=False,
        )

        return user


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


class CitizenComplaintSerializer(serializers.ModelSerializer):
    """Complaint information visible to its submitting citizen."""

    matched_existing_report = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            "id",
            "tracking_code",
            "description",
            "image",
            "lat",
            "lon",
            "location_type",
            "created_at",
            "status",
            "category",
            "department",
            "urgency_level",
            "priority_level",
            "matched_existing_report",
        ]

    def get_matched_existing_report(self, obj):
        return obj.duplicate_links.exists()


class DuplicateLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DuplicateLink
        fields = ["duplicate_of", "text_similarity", "distance_m", "image_match"]


class ComplaintSerializer(serializers.ModelSerializer):
    """Full record, for staff only."""

    duplicate_matches = DuplicateLinkSerializer(
        source="duplicate_links",
        many=True,
        read_only=True,
    )

    citizen_information = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            "id",
            "tracking_code",
            "description",
            "image",
            "lat",
            "lon",
            "location_type",
            "created_at",
            "status",
            "category",
            "department",
            "routing_source",
            "needs_review",
            "routing_reason",
            "urgency_level",
            "urgency_source",
            "base_score",
            "duplicate_count",
            "duplicate_matches",
            "priority_score",
            "priority_level",
            "text_prediction",
            "image_prediction",
            "citizen_information",
        ]

    def get_citizen_information(self, obj):
        if not obj.citizen_id:
            return None

        return CitizenInformationSerializer(obj.citizen).data

class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Complaint.Status.choices)