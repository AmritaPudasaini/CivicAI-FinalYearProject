
import secrets

from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status as http
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import UserProfile
from .otp import create_otp_challenge, verify_otp


class SendOTPThrottle(ScopedRateThrottle):
    scope = "otp_send"


class VerifyOTPThrottle(ScopedRateThrottle):
    scope = "otp_verify"


class CitizenSendOTPView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [SendOTPThrottle]

    def post(self, request):
        phone_number = request.data.get("phone_number", "")
        full_name = request.data.get("full_name", "")

        if not isinstance(phone_number, str):
            return Response(
                {"detail": "Enter a valid mobile phone number."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(full_name, str):
            return Response(
                {"detail": "Enter a valid full name."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        try:
            from .otp import normalize_phone_number

            phone_number = normalize_phone_number(phone_number)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=http.HTTP_400_BAD_REQUEST,
            )

        full_name = full_name.strip()

        if len(full_name) > 150:
            return Response(
                {"detail": "Full name cannot exceed 150 characters."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        profile = UserProfile.objects.filter(
            phone_number=phone_number
        ).select_related("user").first()

        if profile and profile.role != UserProfile.Role.CITIZEN:
            return Response(
                {"detail": "This number cannot be used for citizen login."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        if profile is None and not full_name:
            return Response(
                {"detail": "Full name is required for a new citizen account."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        try:
            create_otp_challenge(
                phone_number=phone_number,
                full_name=full_name,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=http.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": (
                    "OTP generated. Check the development server console "
                    "for your OTP."
                ),
                "expires_in": 300,
            },
            status=http.HTTP_200_OK,
        )


class CitizenVerifyOTPView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [VerifyOTPThrottle]

    def post(self, request):
        phone_number = request.data.get("phone_number", "")
        otp = request.data.get("otp", "")

        if not isinstance(phone_number, str) or not isinstance(otp, str):
            return Response(
                {"detail": "Enter a valid phone number and OTP."},
                status=http.HTTP_400_BAD_REQUEST,
            )

        try:
            challenge = verify_otp(phone_number, otp)
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=http.HTTP_400_BAD_REQUEST,
            )

        phone_number = challenge.phone_number

        with transaction.atomic():
            profile = (
                UserProfile.objects
                .select_for_update()
                .filter(phone_number=phone_number)
                .select_related("user")
                .first()
            )

            if profile and profile.role != UserProfile.Role.CITIZEN:
                challenge.delete()
                return Response(
                    {"detail": "This number cannot be used for citizen login."},
                    status=http.HTTP_403_FORBIDDEN,
                )

            if profile is None:
                full_name = challenge.full_name.strip()

                if not full_name:
                    challenge.delete()
                    return Response(
                        {"detail": "Full name is required to create your account."},
                        status=http.HTTP_400_BAD_REQUEST,
                    )

                user = User(
                    username=f"citizen_{secrets.token_hex(8)}"
                )
                user.first_name = full_name[:150]
                user.set_unusable_password()
                user.save()

                profile = UserProfile.objects.create(
                    user=user,
                    role=UserProfile.Role.CITIZEN,
                    phone_number=phone_number,
                    is_phone_verified=True,
                )
            else:
                user = profile.user
                profile.is_phone_verified = True
                profile.save(update_fields=["is_phone_verified"])

            token, _ = Token.objects.get_or_create(user=user)

            challenge.delete()

        return Response(
            {
                "token": token.key,
                "username": user.username,
                "full_name": user.first_name,
                "role": profile.role,
            },
            status=http.HTTP_200_OK,
        )
