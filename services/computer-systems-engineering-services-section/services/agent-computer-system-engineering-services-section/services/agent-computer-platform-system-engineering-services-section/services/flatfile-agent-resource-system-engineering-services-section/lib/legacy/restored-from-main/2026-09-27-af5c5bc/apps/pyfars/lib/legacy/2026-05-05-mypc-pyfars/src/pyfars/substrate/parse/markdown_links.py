"""Find every ``[text](target)`` link in a markdown body and classify it.

Returns ``Link`` records with kind set; ``target_resolved`` is left None —
resolution against the filesystem is a separate step (see ``index.edges``
or the consumer-specific resolver).

Code regions (fenced code blocks delimited by triple backticks and inline
code spans delimited by single backticks) are masked before scanning so
that example markdown links inside documentation prose — for example, an
inline code span containing ``[foo](foo.md)`` — are not extracted as real
links.
"""
from __future__ import annotations

import re

from pyfars.substrate.parse.link_kind import classify
from pyfars.substrate.types.link import Link

_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
_FENCE_RE = re.compile(r"^\s*```")


def _strip_inline_code(line: str) -> str:
    """Replace inline backtick-spans on one line with same-length spaces."""
    out: list[str] = []
    i = 0
    n = len(line)
    while i < n:
        if line[i] == "`":
            close = line.find("`", i + 1)
            if close == -1:
                out.append(line[i:])
                break
            out.append(" " * (close - i + 1))
            i = close + 1
        else:
            out.append(line[i])
            i += 1
    return "".join(out)


def parse(body: str) -> list[Link]:
    out: list[Link] = []
    in_fence = False
    for line_idx, line in enumerate(body.split("\n"), start=1):
        if _FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        scanline = _strip_inline_code(line)
        for m in _LINK_RE.finditer(scanline):
            target = m.group(2).strip()
            out.append(Link(
                text=m.group(1),
                target_raw=target,
                line=line_idx,
                kind=classify(target),
            ))
    return out
