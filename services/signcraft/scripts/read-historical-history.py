"""One-time, read-only historical receiving input. Never imported by a server or a store.

Reads the earlier relational file of SignCraft history (tables named signcraft_history_*) with the Python
standard library, opened read-only and immutable, and streams every row as one JSON line on stdout:

    {"kind":"source","sha256":...,"tables":{name:count}}
    {"kind":"row","table":name,"row":{column:value}}      (one per row)
    {"kind":"end","sha256":...,"tables":{name:count},"representationBytes":n}

Run it with the writer of the old file stopped, and pipe it to the receiver:

    python3 scripts/read-historical-history.py <historical-file> <sha256-of-file> \
      | node scripts/receive-historical-history.mjs <new-history-path>

The receiver, not this script, writes native custody. The file is untouched: the digest must match the one
the operator names, and must still match when reading ends.
"""
import hashlib, json, pathlib, re, sqlite3, sys, time

MAX_FILE = 256 * 1024 * 1024
MAX_ROWS = 200000
MAX_LINE = 5 * 1024 * 1024
MAX_BYTES = 192 * 1024 * 1024
MAX_SECONDS = 600
TABLE = re.compile(r"^signcraft_history_[a-z_]+$")

if len(sys.argv) != 3:
    raise SystemExit("usage: read-historical-history.py <historical-file> <sha256>")
locator = pathlib.Path(sys.argv[1])
if locator.is_symlink():
    raise ValueError("historical source symlink is refused")
source = locator.resolve(strict=True)
if source.is_symlink() or not source.is_file() or source.stat().st_size > MAX_FILE:
    raise ValueError("historical source is not a bounded regular file")
wal = pathlib.Path(str(source) + "-wal")
if wal.exists() and wal.stat().st_size:
    raise ValueError("nonempty write-ahead log requires separate source custody receiving")


def digest():
    h = hashlib.sha256()
    with source.open("rb") as stream:
        for block in iter(lambda: stream.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def emit(value):
    line = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    if len(line.encode("utf-8")) > MAX_LINE:
        raise ValueError("historical row exceeds the receiving line bound")
    print(line, flush=True)


before = digest()
if before != sys.argv[2]:
    raise ValueError("historical source differs from the admitted source digest")
connection = sqlite3.connect(source.as_uri() + "?mode=ro&immutable=1", uri=True)
connection.execute("PRAGMA query_only=ON")
names = sorted(name for (name,) in connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'signcraft!_history!_%' ESCAPE '!'"))
if not names or any(not TABLE.match(name) for name in names):
    raise ValueError("the file holds no SignCraft history, or an unexpected table name")
counts = {name: connection.execute('SELECT count(*) FROM "' + name + '"').fetchone()[0] for name in names}
if sum(counts.values()) > MAX_ROWS:
    raise ValueError("historical row count exceeds the receiving bound")
emit({"kind": "source", "sha256": before, "tables": counts})
started = time.monotonic()
size = 0
for name in names:
    received = 0
    cursor = connection.execute('SELECT * FROM "' + name + '"')
    columns = [description[0] for description in cursor.description]
    for values in cursor:
        if any(isinstance(value, (bytes, bytearray, memoryview)) for value in values):
            raise ValueError("historical binary column requires explicit custody receiving")
        row = dict(zip(columns, values))
        size += len(json.dumps(row, ensure_ascii=False).encode("utf-8"))
        if size > MAX_BYTES or time.monotonic() - started > MAX_SECONDS:
            raise ValueError("historical receiving resource bound exceeded")
        emit({"kind": "row", "table": name, "row": row})
        received += 1
    if received != counts[name]:
        raise ValueError("historical table row count changed")
connection.close()
after = digest()
if after != before or (wal.exists() and wal.stat().st_size):
    raise ValueError("historical source changed during receiving")
emit({"kind": "end", "sha256": after, "tables": counts, "representationBytes": size})
