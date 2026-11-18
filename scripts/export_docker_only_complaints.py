
import json
import tarfile
from pathlib import Path

from django.conf import settings
from django.core import serializers
from django.core.serializers.json import DjangoJSONEncoder

from complaints.models import Complaint, DuplicateLink


# These are the nine Docker-only complaints.
complaint_ids = list(range(1, 10))

complaints = list(
    Complaint.objects.filter(id__in=complaint_ids).order_by("id")
)

if len(complaints) != 9:
    raise RuntimeError(
        f"Expected 9 complaints, found {len(complaints)}"
    )

# Confirm these complaints are not owned by citizen accounts.
for complaint in complaints:
    if complaint.citizen_id is not None:
        raise RuntimeError(
            f"Complaint {complaint.id} has a citizen account. "
            "Export stopped to avoid missing account relationships."
        )

# Export duplicate links connecting these nine complaints.
links = list(
    DuplicateLink.objects.filter(
        complaint_id__in=complaint_ids,
        duplicate_of_id__in=complaint_ids,
    ).order_by("id")
)

payload = {
    "complaints": json.loads(
        serializers.serialize("json", complaints)
    ),
    "duplicate_links": json.loads(
        serializers.serialize("json", links)
    ),
}

json_path = Path("/tmp/docker-only-complaints.json")

json_path.write_text(
    json.dumps(payload, cls=DjangoJSONEncoder, indent=2),
    encoding="utf-8",
)

# Export the associated image files, preserving their relative paths.
media_root = Path(settings.MEDIA_ROOT)
archive_path = Path("/tmp/docker-only-media.tar.gz")

image_count = 0

with tarfile.open(archive_path, "w:gz") as archive:
    for complaint in complaints:
        if complaint.image:
            image_path = media_root / complaint.image.name

            if not image_path.is_file():
                raise FileNotFoundError(
                    f"Missing image for complaint {complaint.id}: "
                    f"{image_path}"
                )

            archive.add(
                image_path,
                arcname=complaint.image.name,
            )
            image_count += 1

print("Docker export completed successfully.")
print("Complaints:", len(complaints))
print("Duplicate links:", len(links))
print("Images:", image_count)
print("JSON:", json_path)
print("Media archive:", archive_path)
