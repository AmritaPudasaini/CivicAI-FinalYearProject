
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

from .models import Complaint, DuplicateLink, OTPChallenge, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    fields = (
        "role",
        "phone_number",
        "is_phone_verified",
        "employee_id",
        "department",
    )


class CustomUserAdmin(UserAdmin):
    inlines = [UserProfileInline]


# Replace Django's default User admin with one that includes UserProfile.
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "department",
        "category",
        "urgency_level",
        "duplicate_count",
        "priority_score",
        "priority_level",
        "needs_review",
        "status",
        "created_at",
    )
    list_filter = ("department", "priority_level", "status", "needs_review")
    search_fields = ("description", "tracking_code")


@admin.register(OTPChallenge)
class OTPChallengeAdmin(admin.ModelAdmin):
    list_display = (
        "phone_number",
        "created_at",
        "expires_at",
        "attempts",
        "is_verified",
    )
    search_fields = ("phone_number",)
    readonly_fields = (
        "phone_number",
        "otp_hash",
        "full_name",
        "created_at",
        "expires_at",
        "attempts",
        "is_verified",
    )


admin.site.register(DuplicateLink)
