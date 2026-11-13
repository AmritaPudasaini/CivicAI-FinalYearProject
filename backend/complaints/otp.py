
import hashlib
import hmac
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import OTPChallenge


OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS = 5


def normalize_phone_number(phone_number):
    """Normalize a phone number by removing spaces and hyphens."""
    phone_number = phone_number.strip().replace(" ", "").replace("-", "")

    if phone_number.startswith("+"):
        digits = phone_number[1:]
    else:
        digits = phone_number

    if not digits.isdigit() or not (8 <= len(digits) <= 15):
        raise ValueError("Enter a valid mobile phone number.")

    return phone_number


def generate_otp():
    """Generate a cryptographically secure six-digit OTP."""
    return f"{secrets.randbelow(10 ** OTP_LENGTH):06d}"


def hash_otp(phone_number, otp):
    """Hash the OTP using Django's secret key."""
    message = f"{phone_number}:{otp}".encode("utf-8")

    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()


def create_otp_challenge(phone_number, full_name=""):
    """Create a new OTP challenge and print the OTP for development."""
    phone_number = normalize_phone_number(phone_number)
    otp = generate_otp()

    # Invalidate previous challenges for this phone number.
    OTPChallenge.objects.filter(phone_number=phone_number).delete()

    challenge = OTPChallenge.objects.create(
        phone_number=phone_number,
        otp_hash=hash_otp(phone_number, otp),
        full_name=full_name.strip(),
        expires_at=timezone.now() + timedelta(
            minutes=OTP_EXPIRY_MINUTES
        ),
    )

    # Development only: replace this with an SMS provider later.
    print(
        f"\n[CIVICAI DEVELOPMENT OTP] "
        f"Phone: {phone_number} | OTP: {otp}\n"
    )

    return challenge


def verify_otp(phone_number, otp):
    """Verify an OTP and return its challenge if valid."""
    phone_number = normalize_phone_number(phone_number)
    otp = otp.strip()

    if not otp.isdigit() or len(otp) != OTP_LENGTH:
        raise ValueError("Enter a valid six-digit OTP.")

    challenge = (
        OTPChallenge.objects
        .filter(phone_number=phone_number, is_verified=False)
        .order_by("-created_at")
        .first()
    )

    if challenge is None:
        raise ValueError("No active OTP found. Please request a new OTP.")

    if timezone.now() > challenge.expires_at:
        challenge.delete()
        raise ValueError("OTP has expired. Please request a new OTP.")

    if challenge.attempts >= OTP_MAX_ATTEMPTS:
        challenge.delete()
        raise ValueError("Too many attempts. Please request a new OTP.")

    challenge.attempts += 1
    challenge.save(update_fields=["attempts"])

    expected_hash = hash_otp(phone_number, otp)

    if not hmac.compare_digest(challenge.otp_hash, expected_hash):
        raise ValueError("Incorrect OTP. Please try again.")

    challenge.is_verified = True
    challenge.save(update_fields=["is_verified"])

    return challenge
