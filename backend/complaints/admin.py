from django.contrib import admin

from .models import Complaint, DuplicateLink


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ("id", "department", "category", "urgency_level", "duplicate_count",
                    "priority_score", "priority_level", "needs_review", "status", "created_at")
    list_filter = ("department", "priority_level", "status", "needs_review")
    search_fields = ("description",)


admin.site.register(DuplicateLink)