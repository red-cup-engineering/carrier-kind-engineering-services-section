"""Ingest markdown files with YAML frontmatter into SQLite."""
import datetime
import hashlib
import json
import pathlib

import frontmatter
import markdown
import sqlite_utils

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent.parent.parent
SCRIPT_DIR = pathlib.Path(__file__).resolve().parent

db_path = SCRIPT_DIR / "content.db"
db = sqlite_utils.Database(str(db_path))
md = markdown.Markdown()


def make_serializable(value):
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    if isinstance(value, (list, dict)):
        return json.dumps(value, default=str)
    return value


def ingest_file(path, table_name):
    # Use extended-length path prefix on Windows for long paths
    str_path = str(path)
    open_path = "\\\\?\\" + str(path.resolve()) if len(str_path) > 200 else str_path

    try:
        post = frontmatter.load(open_path)
    except Exception as e:
        print(f"  SKIP {path}: {e}")
        return None

    rel_path = str_path.replace("\\", "/")
    row = {
        "_id": hashlib.sha1(rel_path.encode()).hexdigest(),
        "_path": rel_path,
        "text": post.content,
        "html": md.convert(post.content),
    }
    md.reset()

    for key, value in post.metadata.items():
        row[key] = make_serializable(value)

    db[table_name].insert(row, pk="_id", alter=True, replace=True)
    return row


def ingest_dir(root, table_name):
    files = list(pathlib.Path(root).rglob("*.md"))
    print(f"Ingesting {len(files)} files from {root} -> table '{table_name}'")
    ok, skipped = 0, 0
    for f in files:
        if ingest_file(f, table_name):
            ok += 1
        else:
            skipped += 1
    print(f"  {ok} ingested, {skipped} skipped")


ingest_dir(REPO_ROOT / "library" / "domains", "library")
ingest_dir(REPO_ROOT / "departments", "departments")

print("\nDone. Tables:")
for t in db.table_names():
    print(f"  {t}: {db[t].count} rows")
