
from pathlib import Path, PurePosixPath
import hashlib
import os
import shutil
import sqlite3
import tarfile
import tempfile

ROOT = Path.cwd()
DATA = ROOT / "data"

CURRENT_DB = ROOT / "backups/civicai-before-merge-20261118-161633.sqlite3"
OLD_DB = ROOT / "backups/civicai-db-pre-clear-20261118-140247.sqlite3"

CURRENT_MEDIA = ROOT / "backups/civicai-media-before-merge-20261118-161633.tar.gz"
OLD_MEDIA = ROOT / "backups/civicai-media-pre-clear-20261118-140247.tar.gz"

CONFLICT_PATH = "complaints/2026/11/images_1.jpeg"
RENAMED_PATH = "complaints/restored-backup/2026/11/images_1.jpeg"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_media_archive(archive):
    files = {}

    with tarfile.open(archive, "r:gz") as tar:
        for member in tar.getmembers():
            if not member.isfile() or not member.name.startswith("media/"):
                continue

            relative = PurePosixPath(member.name[len("media/"):])

            if relative.is_absolute() or ".." in relative.parts:
                raise RuntimeError(f"Unsafe archive path: {member.name}")

            extracted = tar.extractfile(member)
            if extracted is None:
                raise RuntimeError(f"Cannot read: {member.name}")

            files[str(relative)] = extracted.read()

    return files


def columns(db, table):
    return [r[1] for r in db.execute(f"PRAGMA table_info({table})")]


def set_sequence(db, table):
    maximum = db.execute(
        f"SELECT COALESCE(MAX(id), 0) FROM {table}"
    ).fetchone()[0]

    updated = db.execute(
        "UPDATE sqlite_sequence SET seq=? WHERE name=?",
        (maximum, table),
    )

    if updated.rowcount == 0:
        db.execute(
            "INSERT INTO sqlite_sequence(name, seq) VALUES (?, ?)",
            (table, maximum),
        )


def main():
    if not all(p.is_file() for p in (
        CURRENT_DB, OLD_DB, CURRENT_MEDIA, OLD_MEDIA
    )):
        raise RuntimeError("One or more backup files are missing.")

    if (DATA / "db.sqlite3").exists() or (DATA / "media").exists():
        raise RuntimeError(
            "data/db.sqlite3 or data/media already exists. "
            "Stopping to avoid overwriting existing data."
        )

    print("Reading media archives...")
    current_files = read_media_archive(CURRENT_MEDIA)
    old_files = read_media_archive(OLD_MEDIA)

    print("Current media files:", len(current_files))
    print("Old backup media files:", len(old_files))

    merged_media = dict(current_files)

    for path, content in old_files.items():
        if path not in merged_media:
            merged_media[path] = content
            continue

        if digest(merged_media[path]) == digest(content):
            continue

        if path != CONFLICT_PATH:
            raise RuntimeError(f"Unexpected media conflict: {path}")

        merged_media[RENAMED_PATH] = content
        print("Preserving conflicting old image as:", RENAMED_PATH)

    print("\nPreparing database merge...")

    with tempfile.TemporaryDirectory(dir=DATA) as temporary:
        temporary = Path(temporary)
        staged_db = temporary / "db.sqlite3"
        staged_media = temporary / "media"

        shutil.copy2(CURRENT_DB, staged_db)
        staged_media.mkdir()

        for relative, content in merged_media.items():
            destination = staged_media / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)

        db = sqlite3.connect(staged_db)
        old = sqlite3.connect(OLD_DB)

        try:
            db.execute("PRAGMA foreign_keys = ON")

            for table in ("complaints_complaint", "complaints_duplicatelink"):
                if columns(db, table) != columns(old, table):
                    raise RuntimeError(f"Schema mismatch: {table}")

            current_count = db.execute(
                "SELECT COUNT(*) FROM complaints_complaint"
            ).fetchone()[0]

            old_count = old.execute(
                "SELECT COUNT(*) FROM complaints_complaint"
            ).fetchone()[0]

            if current_count != 1 or old_count != 40:
                raise RuntimeError(
                    f"Unexpected complaint counts: current={current_count}, "
                    f"old={old_count}"
                )

            current_users = {
                r[0] for r in db.execute("SELECT id FROM auth_user")
            }

            old_citizens = {
                r[0] for r in old.execute(
                    "SELECT DISTINCT citizen_id FROM complaints_complaint "
                    "WHERE citizen_id IS NOT NULL"
                )
            }

            if not old_citizens.issubset(current_users):
                raise RuntimeError("Some old complaints reference missing users.")

            current_codes = {
                r[0] for r in db.execute(
                    "SELECT tracking_code FROM complaints_complaint"
                )
            }

            old_codes = {
                r[0] for r in old.execute(
                    "SELECT tracking_code FROM complaints_complaint"
                )
            }

            if current_codes & old_codes:
                raise RuntimeError("Tracking-code collision detected.")

            complaint_columns = columns(db, "complaints_complaint")
            image_index = complaint_columns.index("image")

            old_complaints = old.execute(
                "SELECT * FROM complaints_complaint ORDER BY id"
            ).fetchall()

            if len(old_complaints) != 40:
                raise RuntimeError("Expected exactly 40 old complaints.")

            adjusted_complaints = []

            for row in old_complaints:
                row = list(row)

                if row[image_index] == CONFLICT_PATH:
                    row[image_index] = RENAMED_PATH

                adjusted_complaints.append(tuple(row))

            placeholders = ",".join("?" for _ in complaint_columns)
            column_sql = ",".join(complaint_columns)

            link_columns = columns(db, "complaints_duplicatelink")
            old_links = old.execute(
                "SELECT * FROM complaints_duplicatelink ORDER BY id"
            ).fetchall()

            if len(old_links) != 20:
                raise RuntimeError("Expected exactly 20 duplicate links.")

            with db:
                db.executemany(
                    f"INSERT INTO complaints_complaint "
                    f"({column_sql}) VALUES ({placeholders})",
                    adjusted_complaints,
                )

                db.executemany(
                    f"INSERT INTO complaints_duplicatelink "
                    f"({','.join(link_columns)}) "
                    f"VALUES ({','.join('?' for _ in link_columns)})",
                    old_links,
                )

                set_sequence(db, "complaints_complaint")
                set_sequence(db, "complaints_duplicatelink")

                foreign_key_errors = db.execute(
                    "PRAGMA foreign_key_check"
                ).fetchall()

                if foreign_key_errors:
                    raise RuntimeError(
                        f"Foreign key errors: {foreign_key_errors}"
                    )

            expected = {
                "auth_user": 11,
                "complaints_userprofile": 10,
                "complaints_complaint": 41,
                "complaints_duplicatelink": 20,
            }

            print("\nMerged database verification:")
            for table, count in expected.items():
                actual = db.execute(
                    f"SELECT COUNT(*) FROM {table}"
                ).fetchone()[0]
                print(f"{table}: {actual}")

                if actual != count:
                    raise RuntimeError(
                        f"Unexpected count in {table}: {actual}"
                    )

            for image_path, in db.execute(
                "SELECT image FROM complaints_complaint "
                "WHERE image IS NOT NULL AND image != ''"
            ):
                if not (staged_media / image_path).is_file():
                    raise RuntimeError(
                        f"Missing complaint image: {image_path}"
                    )

            print("\nAll complaint image references verified.")

        finally:
            db.close()
            old.close()

        # Commit the staged files only after all checks pass.
        os.replace(staged_db, DATA / "db.sqlite3")
        os.replace(staged_media, DATA / "media")

    print("\nSUCCESS: Shared database and media prepared.")
    print("Database:", DATA / "db.sqlite3")
    print("Media:", DATA / "media")


if __name__ == "__main__":
    main()
