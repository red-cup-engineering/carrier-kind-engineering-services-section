"""Harness templates and metadata that ship with PyFARS.

Each subdirectory is one harness:

    harnesses/<name>/_index.md         metadata (frontmatter describes target,
                                        runtime, etc.; body documents the harness)
    harnesses/<name>/templates/*.j2    Jinja2 templates rendered against
                                        substrate-derived context

The *templates* live here (in the package, not the substrate) because they
describe the harness's runtime contract — what files it writes and how —
which is intrinsic to pyfars, not to any one polity. The *content* the
templates render against (polity title, captain, theory list, member list)
comes from substrate entities at install time.

Discovery: :func:`available_harnesses` enumerates every harness directory
in this package; :func:`harness_index` reads the ``_index.md`` metadata.
:func:`harness_template_loader` returns a jinja2 loader suitable for
rendering templates from the package — works whether pyfars is installed
as a wheel, run from source, or packaged via Nix.
"""
from __future__ import annotations

from importlib import resources
from importlib.resources.abc import Traversable

from pyfars.substrate.parse.frontmatter import parse as parse_fm


_PACKAGE = "pyfars.harnesses"


def _resource_root() -> Traversable:
    return resources.files(_PACKAGE)


def available_harnesses() -> list[dict]:
    """Enumerate every harness shipped in this package.

    Walks subdirectories of :mod:`pyfars.harnesses`, reads each
    ``_index.md`` for metadata, and returns one dict per harness shaped
    like the legacy substrate-walking enumerator so the install_harness
    verb's caller code is unchanged.
    """
    out: list[dict] = []
    root = _resource_root()
    for child in sorted(root.iterdir(), key=lambda c: c.name):
        if not child.is_dir() or child.name.startswith("_"):
            continue
        idx = child / "_index.md"
        if not idx.is_file():
            continue
        try:
            fm, _body = parse_fm(idx.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not fm or fm.get("type") != "harness":
            continue
        out.append({
            "name": child.name,
            "title": fm.get("title", child.name),
            "target-default": fm.get("target-default"),
            "target-runtime": fm.get("target-runtime"),
            "_index": f"<package:{_PACKAGE}/{child.name}/_index.md>",
        })
    return out


def harness_index(name: str) -> dict | None:
    """Return the parsed frontmatter for a harness's _index.md, or None."""
    idx = _resource_root() / name / "_index.md"
    if not idx.is_file():
        return None
    try:
        fm, _body = parse_fm(idx.read_text(encoding="utf-8"))
    except Exception:
        return None
    return fm


def harness_template_loader(name: str):
    """Return a jinja2 loader for the named harness's templates.

    Uses ``PackageLoader`` so the result works whether pyfars is installed
    as a wheel, run from source, or packaged via Nix's
    buildPythonApplication.
    """
    from jinja2 import PackageLoader
    return PackageLoader(_PACKAGE, f"{name}/templates")
