"""Rename 'kind:' to 'type:' in YAML frontmatter across markdown files.

If a file already has 'type:', drop 'kind:' instead of creating a duplicate.
Only modifies lines inside the YAML frontmatter block (between --- delimiters).
"""
import pathlib
import re

roots = [
    pathlib.Path(__file__).resolve().parent.parent.parent.parent.parent / "library" / "domains",
    pathlib.Path(__file__).resolve().parent.parent.parent.parent.parent / "departments",
]

renamed = 0
dropped = 0
errors = 0

for root in roots:
    for path in root.rglob("*.md"):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            print(f"  ERROR reading {path}: {e}")
            errors += 1
            continue

        # Only process files with frontmatter
        if not text.startswith("---"):
            continue

        lines = text.split("\n")
        # Find end of frontmatter
        end = -1
        for i, line in enumerate(lines[1:], 1):
            if line.strip() == "---":
                end = i
                break
        if end == -1:
            continue

        frontmatter = lines[1:end]
        has_kind = any(re.match(r"^kind\s*:", line) for line in frontmatter)
        has_type = any(re.match(r"^type\s*:", line) for line in frontmatter)

        if not has_kind:
            continue

        new_frontmatter = []
        for line in frontmatter:
            if re.match(r"^kind\s*:", line):
                if has_type:
                    # Already has type, drop kind
                    dropped += 1
                    continue
                else:
                    # Rename kind to type
                    line = re.sub(r"^kind(\s*:)", r"type\1", line)
                    renamed += 1
            new_frontmatter.append(line)

        new_text = "\n".join(lines[:1] + new_frontmatter + lines[end:])
        path.write_text(new_text, encoding="utf-8")

print(f"Done. {renamed} renamed, {dropped} dropped (had both), {errors} errors.")
