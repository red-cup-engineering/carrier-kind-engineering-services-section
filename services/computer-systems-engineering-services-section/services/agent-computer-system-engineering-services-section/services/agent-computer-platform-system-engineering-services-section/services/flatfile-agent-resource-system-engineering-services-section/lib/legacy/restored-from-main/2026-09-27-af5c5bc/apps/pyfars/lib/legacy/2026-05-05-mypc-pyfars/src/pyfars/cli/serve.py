"""``pyfars serve [--host H] [--port P] [--root R]`` — start the FARS web server.

Launches a uvicorn server hosting ``pyfars.web.app:build_app(root)`` —
a FastAPI application with auto-OpenAPI documentation at ``/docs`` and
a small browser UI at ``/`` for reading the corpus (stats, list, show,
search, context) and inspecting substrate runtime status (harnesses,
MCP server, skill/verb counts).

Requires the ``fastapi``, ``uvicorn``, and ``jinja2`` Python packages.
When any are missing, prints an install hint and exits 2.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from pyfars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="serve",
    description="Start the FARS web server (REST API + OpenAPI + browser UI).",
    example="pyfars serve --host 0.0.0.0 --port 5000",
    notes=(
        "Reads SUBSTRATE_HOST / SUBSTRATE_PORT env vars as defaults so the "
        "Replit workflow can drive host/port without rewriting the command. "
        "Browser UI at /; OpenAPI/Swagger at /docs; ReDoc at /redoc."
    ),
    output="uvicorn log lines on stderr; blocks until interrupted.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r",
                  description="corpus root (default: CWD)"),
        Parameter(name="host", kind="flag", default=None,
                  description="bind host (default: $SUBSTRATE_HOST or 127.0.0.1)"),
        Parameter(name="port", kind="flag", type=int, default=None,
                  description="bind port (default: $SUBSTRATE_PORT or 8000)"),
        Parameter(name="reload", kind="store_true",
                  description="enable uvicorn auto-reload (development)"),
    ),
)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)

    try:
        import uvicorn  # noqa: F401
        import fastapi  # noqa: F401
        import jinja2   # noqa: F401
    except ImportError as exc:
        print(f"pyfars serve: missing dependency: {exc.name}", file=sys.stderr)
        print("  enter the Nix devshell or rebuild the PyFARS package",
              file=sys.stderr)
        return 2

    host = args.host or os.environ.get("SUBSTRATE_HOST") or "127.0.0.1"
    port = args.port or int(os.environ.get("SUBSTRATE_PORT") or "8000")
    root = Path(args.root).resolve()

    print(f"pyfars serve: root={root} host={host} port={port}", file=sys.stderr)

    from pyfars.web.app import build_app

    if args.reload:
        # uvicorn reload mode requires an import string, not an app object.
        os.environ["FARS_SERVE_ROOT"] = str(root)
        import uvicorn
        uvicorn.run(
            "pyfars.web._reload_factory:app",
            host=host, port=port, reload=True,
            factory=False,
        )
    else:
        import uvicorn
        app = build_app(root=root)
        uvicorn.run(app, host=host, port=port, log_level="info")
    return 0


if __name__ == "__main__":
    sys.exit(main())
