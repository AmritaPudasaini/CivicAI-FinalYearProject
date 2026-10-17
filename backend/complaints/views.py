from rest_framework import status as http
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Complaint
from .serializers import ComplaintCreateSerializer, ComplaintSerializer, StatusUpdateSerializer

FILTER_FIELDS = ("department", "category", "status", "priority_level", "urgency_level")


class ComplaintListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        """List complaints, highest priority first. Optional filters: ?department=...&status=..."""
        queryset = Complaint.objects.prefetch_related("duplicate_links")
        for field in FILTER_FIELDS:
            value = request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})

        needs_review = request.query_params.get("needs_review")
        if needs_review in ("true", "false"):
            queryset = queryset.filter(needs_review=(needs_review == "true"))

        try:
            limit = max(1, min(int(request.query_params.get("limit", 100)), 500))
        except ValueError:
            limit = 100

        queryset = queryset.order_by("-priority_score", "-created_at")[:limit]
        return Response(ComplaintSerializer(queryset, many=True, context={"request": request}).data)

    def post(self, request):
        """Submit a complaint (text and/or photo) and return the analysed, routed record."""
        serializer = ComplaintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            complaint = services.submit_complaint(
                description=data.get("description", "").strip(),
                image=data.get("image"),
                lat=data.get("lat"),
                lon=data.get("lon"),
                location_type=data.get("location_type", ""),
            )
        except FileNotFoundError as exc:
            return Response({"detail": f"A model file is missing: {exc}"},
                            status=http.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(ComplaintSerializer(complaint, context={"request": request}).data,
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