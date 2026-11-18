
from .models import Complaint, UserProfile


def civic_stats(request):
    if not request.path.startswith("/admin/"):
        return {}

    return {
        "civic_stats": {
            "total_citizens": UserProfile.objects.filter(
                role=UserProfile.Role.CITIZEN
            ).count(),

            "total_authorities": UserProfile.objects.filter(
                role=UserProfile.Role.AUTHORITY
            ).count(),

            "total_complaints": Complaint.objects.count(),

            "needs_review": Complaint.objects.filter(
                needs_review=True
            ).count(),

            "open_complaints": Complaint.objects.filter(
                status=Complaint.Status.OPEN
            ).count(),

            "in_progress": Complaint.objects.filter(
                status=Complaint.Status.IN_PROGRESS
            ).count(),

            "resolved": Complaint.objects.filter(
                status=Complaint.Status.RESOLVED
            ).count(),

            "high_priority": Complaint.objects.filter(
                priority_level__iexact="high"
            ).count(),

            "medium_priority": Complaint.objects.filter(
                priority_level__iexact="medium"
            ).count(),

            "low_priority": Complaint.objects.filter(
                priority_level__iexact="low"
            ).count(),

            "recent_complaints": Complaint.objects.order_by(
                "-created_at"
            )[:5],
        }
    }
