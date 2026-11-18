import json
from pathlib import Path

from django.contrib.auth.models import User
from django.core.serializers.json import DjangoJSONEncoder
from complaints.models import UserProfile, Complaint

emails = [
    "pudasaineeamrita7@gmail.com",
    "pudasainiamrita35@gmail.com",
]

users = []
profiles = []
complaints = []

for email in emails:
    user = User.objects.get(email__iexact=email)
    profile = UserProfile.objects.get(user=user)

    users.append({
        "username": user.username,
        "email": user.email,
        "password": user.password,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "last_login": user.last_login,
        "date_joined": user.date_joined,
    })

    profiles.append({
        "email": email,
        "role": profile.role,
        "phone_number": profile.phone_number,
        "is_phone_verified": profile.is_phone_verified,
        "address": profile.address,
        "employee_id": profile.employee_id,
        "department": profile.department,
    })

    for complaint in Complaint.objects.filter(citizen=user):
        complaints.append({
            "id": complaint.pk,
            "citizen_email": email,
            "tracking_code": complaint.tracking_code,
            "description": complaint.description,
            "image": complaint.image.name,
            "lat": complaint.lat,
            "lon": complaint.lon,
            "location_type": complaint.location_type,
            "created_at": complaint.created_at,
            "status": complaint.status,
            "category": complaint.category,
            "department": complaint.department,
            "routing_source": complaint.routing_source,
            "needs_review": complaint.needs_review,
            "routing_reason": complaint.routing_reason,
            "urgency_level": complaint.urgency_level,
            "urgency_source": complaint.urgency_source,
            "base_score": complaint.base_score,
            "duplicate_count": complaint.duplicate_count,
            "priority_score": complaint.priority_score,
            "priority_level": complaint.priority_level,
            "text_prediction": complaint.text_prediction,
            "image_prediction": complaint.image_prediction,
        })

payload = {
    "users": users,
    "profiles": profiles,
    "complaints": complaints,
}

output = Path("backups/civicai-citizen-migration.json")
output.write_text(json.dumps(payload, cls=DjangoJSONEncoder, indent=2))
output.chmod(0o600)

print("Export completed.")
print("Citizens:", len(users))
print("Profiles:", len(profiles))
print("Complaints:", len(complaints))
print("Output:", output)
print("Complaint image paths:", [c["image"] for c in complaints])

