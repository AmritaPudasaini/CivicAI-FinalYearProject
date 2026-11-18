
from rest_framework.permissions import BasePermission

from .models import UserProfile


class IsAuthority(BasePermission):
    """Allow only authenticated authority accounts."""

    message = "Authority access is required."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated or not user.is_staff:
            return False

        return UserProfile.objects.filter(
            user=user,
            role=UserProfile.Role.AUTHORITY,
        ).exists()


class IsCitizen(BasePermission):
    """Allow authenticated citizen accounts."""

    message = "Citizen account access is required."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return UserProfile.objects.filter(
            user=user,
            role=UserProfile.Role.CITIZEN,
        ).exists()
