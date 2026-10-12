"""FastAPI app exposing FARS as REST + a small browser UI.

Endpoints (all read-only):

  GET  /                       — HTML browser UI.
  GET  /api/health             — liveness probe.
  GET  /api/status             — substrate status: corpus root, note count,
                                 harnesses installed, MCP server launchable,
                                 skill/verb counts.
  GET  /api/verbs              — every CLI verb (name + description).
  GET  /api/skills             — every discoverable skill.
  GET  /api/harnesses          — harnesses available + installed manifests.
  GET  /api/stats              — corpus health overview (wraps pyfars.api.stats).
  GET  /api/list               — enumerate notes; optional kind/domain/path filters.
  GET  /api/show/{target}      — note + in/out edges (slug or path).
  GET  /api/search             — ranked search; ?q=&kind=&domain=&bm25=true.
  GET  /api/context/{slug}     — bounded BFS subgraph from a slug.
  GET  /api/impact/{slug}      — descendant impact analysis for a slug.

OpenAPI schema is auto-published at ``/openapi.json``; Swagger UI at
``/docs``; ReDoc at ``/redoc``.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

import pyfars
from pyfars import api as fars_api
from pyfars.cli.__main__ import VERB_MODULES
from pyfars.cli.help import description_for


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _flatfile_to_dict(n: Any, *, include_body: bool = False) -> dict:
    """Serialize a Flatfile to a JSON-safe dict."""
    out = {
        "slug": n.slug,
        "kind": n.kind,
        "dir": n.dir,
        "path": str(n.path).replace("\\", "/"),
        "title": n.fm.get("title") or n.fm.get("name"),
    }
    if include_body:
        out["fm"] = n.fm
        out["body"] = n.body
    return out


def _safe_json(obj: Any) -> Any:
    """Make arbitrary nested data JSON-serializable (Path → str, set → list)."""
    if isinstance(obj, dict):
        return {str(k): _safe_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_safe_json(v) for v in obj]
    if isinstance(obj, set):
        return sorted(_safe_json(v) for v in obj)
    if isinstance(obj, Path):
        return str(obj).replace("\\", "/")
    if hasattr(obj, "__dict__") and not isinstance(obj, type):
        try:
            return _safe_json(vars(obj))
        except TypeError:
            return repr(obj)
    return obj


# ---------------------------------------------------------------------------
# Status probes
# ---------------------------------------------------------------------------


def _harness_status(root: Path) -> dict:
    """Walk ``operations/engineering/harnesses/`` and ``.fars/`` for state.

    Available harnesses come from harness ``_index.md`` files. Installed
    state is signalled by either an explicit manifest or a per-harness
    presence marker (e.g. ``.agents/skills/`` for the replit harness).
    """
    from pyfars.substrate.parse.frontmatter import parse as parse_fm
    hroot = root / "operations/engineering/harnesses"
    available: list[dict] = []
    if hroot.is_dir():
        for child in sorted(hroot.iterdir()):
            idx = child / "_index.md"
            if not idx.is_file():
                continue
            try:
                fm, _ = parse_fm(idx.read_text(encoding="utf-8"))
            except Exception:
                fm = {}
            if not fm or fm.get("type") != "harness":
                continue
            entry = {
                "name": child.name,
                "title": fm.get("title", child.name),
                "target_default": fm.get("target-default"),
                "_index": str(idx.relative_to(root)).replace("\\", "/"),
                "installed": False,
                "shim_count": 0,
            }
            # Replit harness leaves shims under .agents/skills/
            if child.name == "replit":
                shims = list((root / ".agents/skills").glob("*/SKILL.md"))
                entry["installed"] = len(shims) > 0
                entry["shim_count"] = len(shims)
            available.append(entry)
    return {
        "harness_dir": str(hroot.relative_to(root)).replace("\\", "/")
                        if hroot.exists() else None,
        "available": available,
        "any_installed": any(h["installed"] for h in available),
    }


def _mcp_status(root: Path) -> dict:
    """Report whether the MCP server can launch (deps + entrypoint present).

    The ``pyfars mcp`` verb supports two production transports — ``stdio``
    (subprocess-style, default) and ``http`` (Streamable HTTP at /mcp on
    --host:--port) — plus legacy ``sse``. All three share the same launch
    path; this status block is therefore transport-agnostic.
    """
    runner = root / "operations/engineering/services/mcp-server/run.sh"
    have_mcp = False
    try:
        import mcp  # noqa: F401
        have_mcp = True
    except ImportError:
        pass
    launchable = runner.exists() and have_mcp
    return {
        "runner": str(runner.relative_to(root)).replace("\\", "/")
                  if runner.exists() else None,
        "runner_exists": runner.exists(),
        "runner_executable": runner.exists() and runner.stat().st_mode & 0o111 != 0,
        "mcp_package_installed": have_mcp,
        "launchable": launchable,
        "fars_mcp_verb": "mcp" in VERB_MODULES,
        "transports": {
            "stdio": {
                "available": launchable,
                "launch": "operations/engineering/services/mcp-server/run.sh",
                "description": "subprocess transport — one server per client",
            },
            "http": {
                "available": launchable,
                "launch": "operations/engineering/services/mcp-server/run.sh "
                          "--transport http --host 0.0.0.0 --port 8001",
                "endpoint": "/mcp",
                "description": "Streamable HTTP — long-lived shared server",
            },
            "sse": {
                "available": launchable,
                "launch": "operations/engineering/services/mcp-server/run.sh "
                          "--transport sse --host 0.0.0.0 --port 8002",
                "endpoint": "/sse",
                "description": "legacy SSE transport — kept for older clients",
            },
        },
    }


def _skill_summary(root: Path) -> dict:
    """Count discoverable skills under ``root/operations/engineering/skills``."""
    try:
        from pyfars.skills.api import list_skills
        skills_root = root / "operations/engineering/skills"
        skills = list(list_skills(skills_root=skills_root))
        runnable = [s for s in skills if hasattr(s, "is_runnable") and s.is_runnable()]
        by_pack: dict[str, int] = {}
        for s in skills:
            pack = getattr(s, "pack", None) or "(no pack)"
            by_pack[pack] = by_pack.get(pack, 0) + 1
        return {
            "total": len(skills),
            "runnable": len(runnable),
            "by_pack": by_pack,
        }
    except Exception as exc:
        return {"error": f"{type(exc).__name__}: {exc}"}


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------


def build_app(root: Path | str = ".") -> FastAPI:
    """Build a FastAPI app rooted at ``root``."""
    root_path = Path(root).resolve()

    templates_dir = Path(__file__).parent / "templates"
    templates = Jinja2Templates(directory=str(templates_dir))

    app = FastAPI(
        title="FARS — Flatfile Agentic Resource System",
        description=(
            "REST surface and browser UI for a FARS-backed corpus. "
            "Read-only endpoints over the substrate's verbs."
        ),
        version=getattr(pyfars, "__version__", "0.1.0"),
    )

    # --- UI -------------------------------------------------------------

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    def ui_index(request: Request):
        return templates.TemplateResponse(
            request=request,
            name="index.html",
            context={"root": str(root_path)},
        )

    # --- Status / introspection ----------------------------------------

    @app.get("/api/health", tags=["status"])
    def health():
        return {"status": "ok"}

    @app.get("/api/status", tags=["status"])
    def status():
        try:
            ws = fars_api.workspace(root_path)
            n_notes = len(ws.notes)
        except Exception as exc:
            n_notes = None
            note_err = f"{type(exc).__name__}: {exc}"
        else:
            note_err = None
        return _safe_json({
            "root": str(root_path),
            "version": getattr(pyfars, "__version__", "0.1.0"),
            "n_notes": n_notes,
            "load_error": note_err,
            "verbs": len(VERB_MODULES),
            "harnesses": _harness_status(root_path),
            "mcp": _mcp_status(root_path),
            "skills": _skill_summary(root_path),
        })

    @app.get("/api/verbs", tags=["status"])
    def verbs():
        return [
            {"name": v, "description": description_for(v) or ""}
            for v in sorted(VERB_MODULES)
        ]

    @app.get("/api/skills", tags=["status"])
    def skills():
        return _safe_json(_skill_summary(root_path))

    @app.get("/api/harnesses", tags=["status"])
    def harnesses():
        return _safe_json(_harness_status(root_path))

    @app.get("/api/mcp", tags=["status"])
    def mcp_status():
        return _safe_json(_mcp_status(root_path))

    # --- Corpus reads ---------------------------------------------------

    @app.get("/api/stats", tags=["corpus"])
    def stats():
        try:
            return _safe_json(fars_api.stats(root_path))
        except Exception as exc:
            raise HTTPException(500, f"{type(exc).__name__}: {exc}")

    @app.get("/api/list", tags=["corpus"])
    def list_notes(
        kind: Optional[str] = Query(None),
        domain: Optional[str] = Query(None),
        path_contains: Optional[str] = Query(None),
        limit: int = Query(200, ge=1, le=5000),
    ):
        notes = fars_api.list_notes(
            root_path, kind=kind, domain=domain, path_contains=path_contains
        )
        return {
            "matched": len(notes),
            "limit": limit,
            "items": [_flatfile_to_dict(n) for n in notes[:limit]],
        }

    @app.get("/api/show/{target:path}", tags=["corpus"])
    def show(target: str):
        result = fars_api.show(root_path, target)
        if result is None:
            raise HTTPException(404, f"no note matched {target!r}")
        payload = []
        for n, ins, outs in result:
            payload.append({
                **_flatfile_to_dict(n, include_body=True),
                "outbound": [
                    {"kind": e.kind, "dst": e.dst, "source": e.source}
                    for e in outs
                ],
                "inbound": [
                    {"kind": e.kind, "src": e.src, "source": e.source}
                    for e in ins
                ],
            })
        return _safe_json({"target": target, "matches": payload})

    @app.get("/api/search", tags=["corpus"])
    def search(
        q: str = Query(..., min_length=1, description="search pattern"),
        kind: Optional[str] = None,
        domain: Optional[str] = None,
        bm25: bool = False,
        regex: bool = False,
        limit: int = Query(30, ge=1, le=500),
    ):
        results = fars_api.search(
            root_path, q,
            kind=kind, domain=domain,
            bm25=bm25, use_regex=regex, limit=limit,
        )
        items = []
        for row in results:
            score = row[0]
            note = row[1]
            entry = {
                "score": score,
                **_flatfile_to_dict(note),
            }
            if len(row) > 2:
                entry["hits"] = _safe_json(row[2])
            items.append(entry)
        return {"q": q, "n": len(items), "items": items}

    @app.get("/api/context/{slug}", tags=["corpus"])
    def context(
        slug: str,
        depth: int = Query(2, ge=0, le=10),
        budget: int = Query(8000, ge=100, le=200000),
    ):
        notes = fars_api.context(
            root_path, slug, depth=depth, budget_chars=budget
        )
        if not notes:
            raise HTTPException(404, f"no note matched seed slug {slug!r}")
        return {
            "seed": slug,
            "depth": depth,
            "budget": budget,
            "n": len(notes),
            "body_chars": sum(len(n.body) for n in notes),
            "items": [_flatfile_to_dict(n, include_body=True) for n in notes],
        }

    @app.get("/api/impact/{slug}", tags=["corpus"])
    def impact(slug: str):
        result = fars_api.impact(root_path, slug)
        if result is None:
            raise HTTPException(404, f"no note matched slug {slug!r}")
        return _safe_json(result)

    return app
