
from django.db.models import Count
from rest_framework import status as http
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from . import services
from .models import Complaint, UserProfile
from .permissions import IsAuthority, IsCitizen
from .serializers import (
    CitizenComplaintSerializer,
    ComplaintCreateSerializer,
    ComplaintSerializer,
    PublicComplaintSerializer,
    StatusUpdateSerializer,
)

FILTER_FIELDS = (
    "department",
    "category",
    "status",
    "priority_level",
    "urgency_level",
)


# ---------------- Throttles ----------------
class SubmissionThrottle(AnonRateThrottle):
    scope = "submissions"


class TrackingThrottle(AnonRateThrottle):
    scope = "tracking"


class LoginThrottle(AnonRateThrottle):
    scope = "login"


# ---------------- Pagination ----------------
class ComplaintPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------- Authentication ----------------
class LoginView(ObtainAuthToken):
    """Authority username/password login."""

    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        is_authority = (
            user.is_staff
            and UserProfile.objects.filter(
                user=user,
                role=UserProfile.Role.AUTHORITY,
            ).exists()
        )

        if not is_authority:
            return Response(
                {"detail": "This account does not have authority dashboard access."},
                status=http.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "username": user.username,
            "role": UserProfile.Role.AUTHORITY,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=http.HTTP_204_NO_CONTENT)


# ---------------- Authority complaint APIs ----------------
class ComplaintListCreateView(APIView):
    """
    GET: authority sees all complaints.
    POST: verified citizen submits a complaint.
    """

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsCitizen()]

        return [IsAuthority()]

    def get_throttles(self):
        if self.request.method == "POST":
            return [SubmissionThrottle()]

        return []

    def get(self, request):
        queryset = Complaint.objects.prefetch_related("duplicate_links")

        for field in FILTER_FIELDS:
            value = request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})

        needs_review = request.query_params.get("needs_review")

        if needs_review in ("true", "false"):
            queryset = queryset.filter(
                needs_review=(needs_review == "true")
            )

        queryset = queryset.order_by("-priority_score", "-created_at")

        paginator = ComplaintPagination()
        page = paginator.paginate_queryset(
            queryset,
            request,
            view=self,
        )

        data = ComplaintSerializer(
            page,
            many=True,
            context={"request": request},
        ).data

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
                citizen=request.user,
            )

        except FileNotFoundError as exc:
            return Response(
                {"detail": f"A model file is missing: {exc}"},
                status=http.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response_serializer = CitizenComplaintSerializer(
            complaint,
            context={"request": request},
        )

        return Response(
            response_serializer.data,
            status=http.HTTP_201_CREATED,
        )


class ComplaintDetailView(RetrieveAPIView):
    """Authority-only access to an individual complaint."""

    queryset = Complaint.objects.prefetch_related("duplicate_links")
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthority]


class ComplaintStatusView(APIView):
    """Authority-only complaint status updates."""

    permission_classes = [IsAuthority]

    def patch(self, request, pk):
        try:
            complaint = Complaint.objects.get(pk=pk)

        except Complaint.DoesNotExist:
            return Response(
                {"detail": "Not found."},
                status=http.HTTP_404_NOT_FOUND,
            )

        serializer = StatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        complaint.status = serializer.validated_data["status"]
        complaint.save(update_fields=["status"])

        return Response(
            ComplaintSerializer(
                complaint,
                context={"request": request},
            ).data
        )


# ---------------- Citizen complaint APIs ----------------
class CitizenComplaintListView(ListAPIView):
    """Return only complaints submitted by the authenticated citizen."""

    serializer_class = CitizenComplaintSerializer
    permission_classes = [IsCitizen]
    pagination_class = ComplaintPagination

    def get_queryset(self):
        return (
            Complaint.objects
            .filter(citizen=self.request.user)
            .order_by("-created_at")
        )


# ---------------- Public complaint tracking ----------------
class TrackView(APIView):
    """Public tracking using a complaint tracking code."""

    permission_classes = [AllowAny]
    throttle_classes = [TrackingThrottle]

    def get(self, request, code):
        try:
            complaint = Complaint.objects.get(
                tracking_code=code.upper()
            )

        except Complaint.DoesNotExist:
            return Response(
                {"detail": "No complaint found with that tracking code."},
                status=http.HTTP_404_NOT_FOUND,
            )

        return Response(
            PublicComplaintSerializer(complaint).data
        )


# ---------------- Authority dashboard statistics ----------------
class StatsView(APIView):
    """Authority-only dashboard statistics."""

    permission_classes = [IsAuthority]

    def get(self, request):
        queryset = Complaint.objects.all()

        def count_by(field):
            rows = (
                queryset.order_by()
                .values(field)
                .annotate(n=Count("id"))
            )

            return {
                (row[field] or "unknown"): row["n"]
                for row in rows
            }

        open_queryset = queryset.exclude(
            status=Complaint.Status.RESOLVED
        )

        return Response({
            "total": queryset.count(),
            "open": open_queryset.count(),
            "needs_review": open_queryset.filter(
                needs_review=True
            ).count(),
            "with_duplicates": queryset.filter(
                duplicate_count__gt=0
            ).count(),
            "by_status": count_by("status"),
            "by_department": count_by("department"),
            "by_priority_level": count_by("priority_level"),
            "by_category": count_by("category"),
        })
