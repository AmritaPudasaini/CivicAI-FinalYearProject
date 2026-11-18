
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

from .models import Complaint, DuplicateLink, OTPChallenge, UserProfile

from django.contrib.admin import AdminSite
from django.contrib.auth.models import User
from django.db.models import Count

# --------------------------------------------------
# Django Admin branding
# --------------------------------------------------

admin.site.site_header = "CIVICAI Administration"
admin.site.site_title = "CIVICAI Admin Portal"
admin.site.index_title = "CIVICAI System Management"

class CivicAIAdminSite(AdminSite):
    site_header = "CIVICAI Administration"
    site_title = "CIVICAI Admin Portal"
    index_title = "CIVICAI System Management"
    index_template = "admin/index.html"

    def index(self, request, extra_context=None):
        total_citizens = UserProfile.objects.filter(
            role=UserProfile.Role.CITIZEN
        ).count()

        total_authorities = UserProfile.objects.filter(
            role=UserProfile.Role.AUTHORITY
        ).count()

        civic_stats = {
            "total_citizens": total_citizens,
            "total_authorities": total_authorities,
            "total_complaints": Complaint.objects.count(),
            "needs_review": Complaint.objects.filter(needs_review=True).count(),
            "open_complaints": Complaint.objects.filter(status="open").count(),
            "in_progress": Complaint.objects.filter(status="in_progress").count(),
            "resolved": Complaint.objects.filter(status="resolved").count(),
            "high_priority": Complaint.objects.filter(priority_level="high").count(),
            "medium_priority": Complaint.objects.filter(priority_level="medium").count(),
            "low_priority": Complaint.objects.filter(priority_level="low").count(),
            "recent_complaints": Complaint.objects.order_by("-created_at")[:5],
        }

        extra_context = extra_context or {}
        extra_context["civic_stats"] = civic_stats

        return super().index(request, extra_context=extra_context)
# --------------------------------------------------
# User and citizen/authority management
# --------------------------------------------------

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0

    fields = (
        "role",
        "address",
        "phone_number",
        "is_phone_verified",
        "employee_id",
        "department",
    )


class CustomUserAdmin(UserAdmin):
    inlines = [UserProfileInline]

    list_display = (
        "username",
        "email",
        "first_name",
        "is_active",
        "is_staff",
        "is_superuser",
    )

    list_filter = (
        "is_active",
        "is_staff",
        "is_superuser",
        "date_joined",
    )

    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
    )

    ordering = ("-date_joined",)


admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "role",
        "address",
        "phone_number",
        "department",
        "employee_id",
        "is_phone_verified",
    )

    list_filter = (
        "role",
        "is_phone_verified",
        "department",
    )

    search_fields = (
        "user__username",
        "user__email",
        "user__first_name",
        "phone_number",
        "employee_id",
    )

    autocomplete_fields = ("user",)


# --------------------------------------------------
# Complaint management
# --------------------------------------------------

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "tracking_code",
        "citizen",
        "category",
        "department",
        "urgency_level",
        "duplicate_count",
        "priority_score",
        "priority_level",
        "needs_review",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "department",
        "category",
        "urgency_level",
        "priority_level",
        "needs_review",
        "created_at",
    )

    search_fields = (
        "tracking_code",
        "description",
        "citizen__username",
        "citizen__email",
        "department",
        "category",
    )

    readonly_fields = (
        "tracking_code",
        "created_at",
        "text_prediction",
        "image_prediction",
    )

    autocomplete_fields = ("citizen",)

    date_hierarchy = "created_at"

    list_per_page = 25

    list_select_related = ("citizen",)

    fieldsets = (
        (
            "Complaint Information",
            {
                "fields": (
                    "tracking_code",
                    "citizen",
                    "description",
                    "image",
                    "created_at",
                    "status",
                )
            },
        ),
        (
            "Location Information",
            {
                "fields": (
                    "lat",
                    "lon",
                    "location_type",
                )
            },
        ),
        (
            "AI Classification and Routing",
            {
                "fields": (
                    "category",
                    "department",
                    "routing_source",
                    "routing_reason",
                    "needs_review",
                )
            },
        ),
        (
            "Urgency and Priority",
            {
                "fields": (
                    "urgency_level",
                    "urgency_source",
                    "base_score",
                    "duplicate_count",
                    "priority_score",
                    "priority_level",
                )
            },
        ),
        (
            "AI Model Outputs",
            {
                "classes": ("collapse",),
                "fields": (
                    "text_prediction",
                    "image_prediction",
                ),
            },
        ),
    )


# --------------------------------------------------
# Duplicate complaint management
# --------------------------------------------------

@admin.register(DuplicateLink)
class DuplicateLinkAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "complaint",
        "duplicate_of",
        "text_similarity",
        "distance_m",
        "image_match",
    )

    list_filter = ("image_match",)

    search_fields = (
        "complaint__tracking_code",
        "duplicate_of__tracking_code",
    )

    autocomplete_fields = (
        "complaint",
        "duplicate_of",
    )

    list_per_page = 25


# --------------------------------------------------
# OTP records
# --------------------------------------------------

@admin.register(OTPChallenge)
class OTPChallengeAdmin(admin.ModelAdmin):

    list_display = (
        "phone_number",
        "full_name",
        "created_at",
        "expires_at",
        "attempts",
        "is_verified",
    )

    list_filter = (
        "is_verified",
        "created_at",
    )

    search_fields = (
        "phone_number",
        "full_name",
    )

    readonly_fields = (
        "phone_number",
        "otp_hash",
        "full_name",
        "created_at",
        "expires_at",
        "attempts",
        "is_verified",
    )

    list_per_page = 25
