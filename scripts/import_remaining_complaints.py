
import json
import tarfile
from pathlib import Path, PurePosixPath

from django.conf import settings
from django.db import transaction
from django.utils.dateparse import parse_datetime

from complaints.models import Complaint, DuplicateLink


JSON_PATH = Path("/tmp/local-complaints-migration.json")
ARCHIVE_PATH = Path("/tmp/local-complaints-media.tar.gz")


def map_complaint_id(old_id):
    return old_id + 31 if old_id <= 9 else old_id


def main():
    if not JSON_PATH.is_file() or not ARCHIVE_PATH.is_file():
        raise FileNotFoundError("Migration files are missing from Docker.")

    payload = json.loads(JSON_PATH.read_text())
    complaints_data = payload["complaints"]
    links_data = payload["duplicate_links"]

    print("Checking migration data...")

    if len(complaints_data) != 30 or len(links_data) != 16:
        raise RuntimeError("Unexpected export counts.")

    if Complaint.objects.count() != 10:
        raise RuntimeError("Expected exactly 10 existing complaints.")

    if DuplicateLink.objects.count() != 4:
        raise RuntimeError("Expected exactly 4 existing duplicate links.")

    old_ids = {item["id"] for item in complaints_data}

    if len(old_ids) != 30:
        raise RuntimeError("Duplicate complaint IDs in export.")

    id_map = {
        old_id: map_complaint_id(old_id)
        for old_id in old_ids
    }

    new_ids = set(id_map.values())

    if len(new_ids) != 30:
        raise RuntimeError("Mapped complaint IDs are not unique.")

    occupied_ids = set(
        Complaint.objects.filter(id__in=new_ids)
        .values_list("id", flat=True)
    )

    if occupied_ids:
        raise RuntimeError(
            f"Complaint ID conflicts: {sorted(occupied_ids)}"
        )

    existing_codes = set(
        Complaint.objects.values_list("tracking_code", flat=True)
    )

    imported_codes = [
        item["tracking_code"] for item in complaints_data
    ]

    if len(set(imported_codes)) != 30:
        raise RuntimeError("Duplicate tracking codes in export.")

    conflicts = existing_codes.intersection(imported_codes)

    if conflicts:
        raise RuntimeError(
            f"Tracking code conflicts: {sorted(conflicts)}"
        )

    for link in links_data:
        if (
            link["complaint_id"] not in old_ids
            or link["duplicate_of_id"] not in old_ids
        ):
            raise RuntimeError("Invalid duplicate link reference.")

    media_root = Path(settings.MEDIA_ROOT)
    copied_images = []

    try:
        with tarfile.open(ARCHIVE_PATH, "r:gz") as archive:
            members = {}

            for member in archive.getmembers():
                path = PurePosixPath(member.name)

                if (
                    path.is_absolute()
                    or ".." in path.parts
                    or not member.isfile()
                    or not path.parts
                    or path.parts[0] != "complaints"
                ):
                    raise RuntimeError(
                        f"Unsafe archive entry: {member.name}"
                    )

                if member.name in members:
                    raise RuntimeError(
                        f"Duplicate archive entry: {member.name}"
                    )

                members[member.name] = member

            expected_images = {
                item["image"]
                for item in complaints_data
                if item["image"]
            }

            if set(members) != expected_images:
                raise RuntimeError(
                    "Archive contents do not match the JSON export."
                )

            if len(expected_images) != 13:
                raise RuntimeError("Expected exactly 13 images.")

            image_destinations = {}

            for original_name in expected_images:
                original_path = PurePosixPath(original_name)
                suffix = Path(*original_path.parts[1:])

                new_name = (
                    Path("complaints")
                    / "migrated-local"
                    / suffix
                )

                destination = media_root / new_name

                if destination.exists():
                    raise RuntimeError(
                        f"Image already exists: {destination}"
                    )

                image_destinations[original_name] = (
                    new_name.as_posix(),
                    destination,
                )

            # Copy images into a separate directory.
            for original_name, (new_name, destination) in (
                image_destinations.items()
            ):
                destination.parent.mkdir(
                    parents=True,
                    exist_ok=True,
                )

                source = archive.extractfile(members[original_name])

                if source is None:
                    raise RuntimeError(
                        f"Cannot read image: {original_name}"
                    )

                with source, destination.open("xb") as output:
                    output.write(source.read())

                copied_images.append(destination)

        if len(copied_images) != 13:
            raise RuntimeError("Image copy verification failed.")

        print("Images copied and verified:", len(copied_images))

        # Import complaints and duplicate links atomically.
        with transaction.atomic():
            for item in complaints_data:
                image_name = None

                if item["image"]:
                    image_name = image_destinations[
                        item["image"]
                    ][0]

                created_at = parse_datetime(item["created_at"])

                if created_at is None:
                    raise RuntimeError(
                        f"Invalid creation date for complaint {item['id']}"
                    )

                Complaint.objects.create(
                    id=id_map[item["id"]],
                    tracking_code=item["tracking_code"],
                    description=item["description"],
                    image=image_name,
                    lat=item["lat"],
                    lon=item["lon"],
                    location_type=item["location_type"],
                    created_at=created_at,
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
                    citizen=None,
                )

            for item in links_data:
                DuplicateLink.objects.create(
                    complaint_id=id_map[item["complaint_id"]],
                    duplicate_of_id=id_map[item["duplicate_of_id"]],
                    text_similarity=item["text_similarity"],
                    distance_m=item["distance_m"],
                    image_match=item["image_match"],
                )

            # Verify before committing.
            final_count = Complaint.objects.count()
            final_links_count = DuplicateLink.objects.count()

            if final_count != 40:
                raise RuntimeError(
                    f"Expected 40 complaints, found {final_count}."
                )

            if final_links_count != 20:
                raise RuntimeError(
                    f"Expected 20 duplicate links, found "
                    f"{final_links_count}."
                )

        print("\nMigration completed successfully!")
        print("Imported complaints:", len(complaints_data))
        print("Imported duplicate links:", len(links_data))
        print("Imported images:", len(copied_images))
        print("Total Docker complaints:", final_count)
        print("Total Docker duplicate links:", final_links_count)

        print("\nComplaint ID mapping:")

        for old_id in sorted(id_map):
            print(f"Local {old_id} -> Docker {id_map[old_id]}")

    except Exception:
        # Remove newly copied files if anything fails.
        for path in copied_images:
            path.unlink(missing_ok=True)

        raise


main()

