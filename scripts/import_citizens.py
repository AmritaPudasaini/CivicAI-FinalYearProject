
import json
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management import call_command
from django.db import transaction
from django.utils.dateparse import parse_datetime

from complaints.models import UserProfile, Complaint


SOURCE = Path("/tmp/civicai-citizen-migration.json")
MEDIA_ROOT = Path("/data/media")

if not SOURCE.exists():
    raise FileNotFoundError(f"Migration file not found: {SOURCE}")

data = json.loads(SOURCE.read_text())

users_by_email = {
    item["email"].lower(): item
    for item in data["users"]
}

profiles_by_email = {
    item["email"].lower(): item
    for item in data["profiles"]
}

with transaction.atomic():

    # 1. Free the citizen email currently assigned to the root admin.
    root = User.objects.get(username="root")

    if root.email.lower() == "pudasaineeamrita7@gmail.com":
        if User.objects.filter(email__iexact="admin@civicai.local").exclude(
            pk=root.pk
        ).exists():
            raise ValueError("admin@civicai.local is already in use.")

        root.email = "admin@civicai.local"
        root.save(update_fields=["email"])

    # 2. Validate users before importing.
    for email, user_data in users_by_email.items():
        if User.objects.filter(username=user_data["username"]).exists():
            raise ValueError(f"Username already exists: {user_data['username']}")

        if User.objects.filter(email__iexact=email).exists():
            raise ValueError(f"Email already exists: {email}")

        if user_data["is_staff"] or user_data["is_superuser"]:
            raise ValueError(f"Unexpected admin privileges in citizen account: {email}")

        profile_data = profiles_by_email.get(email)

        if not profile_data or profile_data["role"] != UserProfile.Role.CITIZEN:
            raise ValueError(f"Missing or invalid citizen profile: {email}")

    # 3. Validate complaint IDs, tracking codes, and images.
    for complaint_data in data["complaints"]:
        if Complaint.objects.filter(pk=complaint_data["id"]).exists():
            raise ValueError(f"Complaint ID already exists: {complaint_data['id']}")

        if Complaint.objects.filter(
            tracking_code=complaint_data["tracking_code"]
        ).exists():
            raise ValueError(
                f"Tracking code already exists: {complaint_data['tracking_code']}"
            )

        if complaint_data["citizen_email"].lower() not in users_by_email:
            raise ValueError("Complaint references an unknown citizen.")

        image_name = complaint_data["image"]
        if image_name and not (MEDIA_ROOT / image_name).is_file():
            raise FileNotFoundError(f"Complaint image missing: {image_name}")

    # 4. Import citizen accounts and profiles.
    imported_users = {}

    for email, user_data in users_by_email.items():
        user = User(
            username=user_data["username"],
            email=user_data["email"],
            password=user_data["password"],
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            is_active=user_data["is_active"],
            is_staff=False,
            is_superuser=False,
            last_login=parse_datetime(user_data["last_login"])
            if user_data["last_login"] else None,
            date_joined=parse_datetime(user_data["date_joined"]),
        )
        user.save(force_insert=True)

        profile_data = profiles_by_email[email]

        UserProfile.objects.create(
            user=user,
            role=profile_data["role"],
            phone_number=profile_data["phone_number"],
            is_phone_verified=profile_data["is_phone_verified"],
            address=profile_data["address"],
            employee_id=profile_data["employee_id"],
            department=profile_data["department"],
        )

        imported_users[email] = user

    # 5. Import the citizen's complaint with its original ID.
    for item in data["complaints"]:
        citizen = imported_users[item["citizen_email"].lower()]

        Complaint.objects.create(
            id=item["id"],
            citizen=citizen,
            tracking_code=item["tracking_code"],
            description=item["description"],
            image=item["image"],
            lat=item["lat"],
            lon=item["lon"],
            location_type=item["location_type"],
            created_at=parse_datetime(item["created_at"]),
            status=item["status"],
            category=item["category"],
            department=item["department"],
            routing_source=item["routing_source"],
            needs_review=item["needs_review"],
            routing_reason=item["routing_reason"],
            urgency_level=item["urgency_level"],
            urgency_source=item["urgency_source"],
            base_score=item["base_score"],
            duplicate_count=item["duplicate_count"],
            priority_score=item["priority_score"],
            priority_level=item["priority_level"],
            text_prediction=item["text_prediction"],
            image_prediction=item["image_prediction"],
        )

    # 6. Update SQLite's complaint ID sequence.
    call_command("sqlsequencereset", "complaints", stdout=open("/tmp/sequence_reset.sql", "w"))

print("Migration completed successfully.")
print("Citizens imported:", len(imported_users))
print("Profiles imported:", len(imported_users))
print("Complaints imported:", len(data["complaints"]))
print("Root admin email:", User.objects.get(username="root").email)
