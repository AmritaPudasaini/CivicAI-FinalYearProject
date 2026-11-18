
import json
import tarfile
from pathlib import Path

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from complaints.models import Complaint, DuplicateLink

output_dir = Path("backups")
output_dir.mkdir(exist_ok=True)

# Complaint 31 was already migrated.
shared = Complaint.objects.get(pk=31)
assert shared.tracking_code == "CV-4FUY4T6W"

complaints = list(
    Complaint.objects.filter(id__lte=30).order_by("id")
)

assert len(complaints) == 30
assert all(c.citizen_id is None for c in complaints)

complaint_ids = {c.pk for c in complaints}

links = list(
    DuplicateLink.objects.filter(
        complaint_id__in=complaint_ids,
        duplicate_of_id__in=complaint_ids,
    ).order_by("id")
)

# Ensure no link points outside the migration set.
all_related_links = DuplicateLink.objects.filter(
    complaint_id__in=complaint_ids
).union(
    DuplicateLink.objects.filter(duplicate_of_id__in=complaint_ids)
)

assert all_related_links.count() == len(links)

complaint_data = []

for c in complaints:
    complaint_data.append({
        "id": c.pk,
        "tracking_code": c.tracking_code,
        "description": c.description,
        "image": c.image.name if c.image else None,
        "lat": c.lat,
        "lon": c.lon,
        "location_type": c.location_type,
        "created_at": c.created_at,
        "status": c.status,
        "category": c.category,
        "department": c.department,
        "routing_source": c.routing_source,
        "needs_review": c.needs_review,
        "routing_reason": c.routing_reason,
        "urgency_level": c.urgency_level,
        "urgency_source": c.urgency_source,
        "base_score": c.base_score,
        "duplicate_count": c.duplicate_count,
        "priority_score": c.priority_score,
        "priority_level": c.priority_level,
        "text_prediction": c.text_prediction,
        "image_prediction": c.image_prediction,
    })

link_data = [
    {
        "complaint_id": link.complaint_id,
        "duplicate_of_id": link.duplicate_of_id,
        "text_similarity": link.text_similarity,
        "distance_m": link.distance_m,
        "image_match": link.image_match,
    }
    for link in links
]

# Export all referenced images.
media_root = Path(settings.MEDIA_ROOT)
archive_path = output_dir / "local-complaints-media.tar.gz"
image_paths = set()

with tarfile.open(archive_path, "w:gz") as archive:
    for c in complaints:
        if c.image:
            image_path = media_root / c.image.name

            if not image_path.is_file():
                raise FileNotFoundError(image_path)

            image_paths.add(c.image.name)
            archive.add(image_path, arcname=c.image.name)

payload = {
    "complaints": complaint_data,
    "duplicate_links": link_data,
}

json_path = output_dir / "local-complaints-migration.json"
json_path.write_text(
    json.dumps(payload, cls=DjangoJSONEncoder, indent=2)
)

print("Export completed successfully.")
print("Complaints:", len(complaint_data))
print("Duplicate links:", len(link_data))
print("Images:", len(image_paths))
print("JSON:", json_path)
print("Media archive:", archive_path)
print("Shared complaint skipped: ID 31")
