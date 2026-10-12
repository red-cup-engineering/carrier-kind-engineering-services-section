"""Render a chapter narrative as an H3-rooted section."""
from __future__ import annotations

from typing import Container

from pyfars.render._demote_headings import demote
from pyfars.render._link_rewrite import rewrite
from pyfars.render._strip_lean import strip
from pyfars.render._title import title_and_body
from pyfars.substrate.flatfile import Flatfile


def render(narr: Flatfile, all_slugs: Container[str]) -> str:
    title, body = title_and_body(narr)
    body = strip(body)
    body = demote(body, 2)
    body = rewrite(body, all_slugs)
    return f"### {title} {{#{narr.slug}}}\n\n{body}\n"
