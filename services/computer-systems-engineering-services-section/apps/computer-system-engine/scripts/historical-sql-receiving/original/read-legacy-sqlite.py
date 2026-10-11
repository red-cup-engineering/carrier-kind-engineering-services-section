"""Read-only, bounded receiver of a legacy SQLite file. Never imported by a server.

The node runtime keeps no SQL: a read-once admission of a store left from before the journals
runs this script, which opens the file read-only and immutable, then streams its rows as one JSON
object per line on stdout for the admission to record into its journal.

  python3 -I read-legacy-sqlite.py <file> '<specs>'

<specs> is a JSON list of {"table", "order"?, "rowid"?: true, "join"?: {"table", "on", "columns"}}; "rowid" adds
each row's rowid as the column "rowid" (a table that keeps no column for it, such as an FTS5 table). A table or
column is named only if the file holds it; a table the file lacks is simply not read. Lines:
{"kind":"source","tables":[...]}, then {"kind":"row","table":T,"row":{...}} per row (a join's
columns arrive as "<table>.<column>", bytes as {"$blob":base64}), then {"kind":"end","counts":{...}}.
A nonempty -wal or -journal beside the file is refused (its rows would be missed): checkpoint the
store first. The file is never written; a size or modification time that changed while it was read,
an oversized file or row, or a run past its time bound is refused, and the exit status is nonzero.
"""
import base64, json, pathlib, sqlite3, sys, time

FILE_BYTES = 8 * 1024 ** 3
ROW_BYTES = 16 * 1024 * 1024
SECONDS = 1800
SAFE_INTEGER = 2 ** 53


def refuse(message):
    raise ValueError(message)


def emit(value):
    sys.stdout.write(json.dumps(value, separators=(",", ":"), ensure_ascii=False, allow_nan=False) + "\n")
    sys.stdout.flush()


def plain(value):
    if isinstance(value, bytes):
        return {"$blob": base64.b64encode(value).decode("ascii")}
    if isinstance(value, int) and abs(value) > SAFE_INTEGER:
        refuse("integer beyond the exact range of a JSON number")
    return value


def main(argv):
    if len(argv) != 3:
        refuse("usage: read-legacy-sqlite.py <file> <specs>")
    specs = json.loads(argv[2])
    locator = pathlib.Path(argv[1])
    if locator.is_symlink():
        refuse("legacy source symlink is refused")
    source = locator.resolve(strict=True)
    if not source.is_file() or source.stat().st_size > FILE_BYTES:
        refuse("legacy source is not a bounded regular file")
    with source.open("rb") as stream:
        if stream.read(16) != b"SQLite format 3\x00":
            refuse("legacy source is not an SQLite database")

    def side():
        return [p for p in (pathlib.Path(str(source) + "-wal"), pathlib.Path(str(source) + "-journal")) if p.exists() and p.stat().st_size]

    def fingerprint():
        status = source.stat()
        return (status.st_size, status.st_mtime_ns)

    if side():
        refuse("nonempty -wal or -journal beside the legacy source: checkpoint the store first")
    before = fingerprint()
    connection = sqlite3.connect(source.as_uri() + "?mode=ro&immutable=1", uri=True)
    connection.execute("PRAGMA query_only=ON")
    held = {name for (name,) in connection.execute("SELECT name FROM sqlite_master WHERE type IN ('table','view')")}

    def name(value):
        if not isinstance(value, str) or '"' in value or "\x00" in value:
            refuse("unusable name")
        return '"' + value + '"'

    def columns(table):
        return [row[1] for row in connection.execute("PRAGMA table_info(" + name(table) + ")")]

    plans = []
    for spec in specs:
        table = spec["table"]
        if table not in held:
            continue
        held_columns = columns(table)
        select, join, order = ("t.rowid AS \"rowid\", t.*" if spec.get("rowid") is True else "t.*"), "", ""
        if spec.get("order") is not None:
            if spec["order"] != "rowid" and spec["order"] not in held_columns:
                refuse("order names a column the table lacks")
            order = " ORDER BY t." + ("rowid" if spec["order"] == "rowid" else name(spec["order"]))
        if spec.get("join") is not None:
            other = spec["join"]
            if other["table"] not in held or other["on"] not in held_columns or other["on"] not in columns(other["table"]):
                refuse("join names a table or column the file lacks")
            joined = columns(other["table"])
            for column in other["columns"]:
                if column not in joined:
                    refuse("join names a column the table lacks")
                select += ", j." + name(column) + " AS " + name(other["table"] + "." + column)
            join = " JOIN " + name(other["table"]) + " AS j ON j." + name(other["on"]) + " = t." + name(other["on"])
        plans.append((table, "SELECT " + select + " FROM " + name(table) + " AS t" + join + order))

    emit({"kind": "source", "tables": sorted(held)})
    started = time.monotonic()
    counts = {}
    for table, statement in plans:
        counts[table] = 0
        cursor = connection.execute(statement)
        labels = [description[0] for description in cursor.description]
        for values in cursor:
            line = {"kind": "row", "table": table, "row": dict(zip(labels, (plain(v) for v in values)))}
            if len(json.dumps(line, ensure_ascii=False).encode("utf-8")) > ROW_BYTES or time.monotonic() - started > SECONDS:
                refuse("legacy receiving resource bound exceeded")
            emit(line)
            counts[table] += 1
    connection.close()
    if fingerprint() != before or side():
        refuse("legacy source changed during receiving")
    emit({"kind": "end", "counts": counts})


try:
    main(sys.argv)
except (ValueError, KeyError, TypeError, OSError, sqlite3.Error) as error:
    sys.stderr.write(type(error).__name__ + ": " + str(error) + "\n")
    sys.exit(2)
