from django.db.models import Count
from rest_framework import status as http
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.generics import RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from . import services
from .models import Complaint
from .serializers import (
    ComplaintCreateSerializer,
    ComplaintSerializer,
    PublicComplaintSerializer,
    StatusUpdateSerializer,
)

FILTER_FIELDS = ("department", "category", "status", "priority_level", "urgency_level")


# ---------------- Throttles (rates are set in settings.py) ----------------
class SubmissionThrottle(AnonRateThrottle):
    scope = "submissions"


class TrackingThrottle(AnonRateThrottle):
    scope = "tracking"


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class ComplaintPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------- Authentication ----------------
class LoginView(ObtainAuthToken):
    """POST {username, password} -> {token}. Only staff accounts may log in to the dashboard."""
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        if not user.is_staff:
            return Response({"detail": "This account does not have dashboard access."},
                            status=http.HTTP_403_FORBIDDEN)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "username": user.username})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=http.HTTP_204_NO_CONTENT)


# ---------------- Complaints ----------------
class ComplaintListCreateView(APIView):
    """GET (staff): paginated list, highest priority first.  POST (anyone): submit a complaint."""
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "POST":
            return [AllowAny()]
        return super().get_permissions()          # staff only

    def get_throttles(self):
        return [SubmissionThrottle()] if self.request.method == "POST" else []

    def get(self, request):
        queryset = Complaint.objects.prefetch_related("duplicate_links")
        for field in FILTER_FIELDS:
            value = request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})

        needs_review = request.query_params.get("needs_review")
        if needs_review in ("true", "false"):
            queryset = queryset.filter(needs_review=(needs_review == "true"))

        queryset = queryset.order_by("-priority_score", "-created_at")
        paginator = ComplaintPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        data = ComplaintSerializer(page, many=True, context={"request": request}).data
        return paginator.get_paginated_response(data)

    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            complaint = services.submit_complaint(
                description=data.get("description", "").strip(),
                image=data.get("image"),
                lat=data["lat"],
                lon=data["lon"],
                location_type=data.get("location_type", ""),
            )
        except FileNotFoundError as exc:
            return Response({"detail": f"A model file is missing: {exc}"},
                            status=http.HTTP_503_SERVICE_UNAVAILABLE)

        # Staff see everything; citizens only get what they need
        serializer_class = ComplaintSerializer if request.user.is_staff else PublicComplaintSerializer
        return Response(serializer_class(complaint, context={"request": request}).data,
                        status=http.HTTP_201_CREATED)


class ComplaintDetailView(RetrieveAPIView):
    queryset = Complaint.objects.prefetch_related("duplicate_links")
    serializer_class = ComplaintSerializer


class ComplaintStatusView(APIView):
    def patch(self, request, pk):
        """Authority marks a complaint open / in_progress / resolved."""
        try:
            complaint = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return Response({"detail": "Not found."}, status=http.HTTP_404_NOT_FOUND)

        serializer = StatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint.status = serializer.validated_data["status"]
        complaint.save(update_fields=["status"])
        return Response(ComplaintSerializer(complaint, context={"request": request}).data)


class TrackView(APIView):
    """Public: a citizen looks up their complaint by tracking code."""
    permission_classes = [AllowAny]
    throttle_classes = [TrackingThrottle]

    def get(self, request, code):
        try:
            complaint = Complaint.objects.get(tracking_code=code.upper())
        except Complaint.DoesNotExist:
            return Response({"detail": "No complaint found with that tracking code."},
                            status=http.HTTP_404_NOT_FOUND)
        return Response(PublicComplaintSerializer(complaint).data)


class StatsView(APIView):
    """Staff: summary numbers for the dashboard."""

    def get(self, request):
        queryset = Complaint.objects.all()

        def count_by(field):
            rows = queryset.order_by().values(field).annotate(n=Count("id"))
            return {(row[field] or "unknown"): row["n"] for row in rows}

        open_queryset = queryset.exclude(status=Complaint.Status.RESOLVED)
        return Response({
            "total": queryset.count(),
            "open": open_queryset.count(),
            "needs_review": open_queryset.filter(needs_review=True).count(),
            "with_duplicates": queryset.filter(duplicate_count__gt=0).count(),
            "by_status": count_by("status"),
            "by_department": count_by("department"),
            "by_priority_level": count_by("priority_level"),
            "by_category": count_by("category"),
        })