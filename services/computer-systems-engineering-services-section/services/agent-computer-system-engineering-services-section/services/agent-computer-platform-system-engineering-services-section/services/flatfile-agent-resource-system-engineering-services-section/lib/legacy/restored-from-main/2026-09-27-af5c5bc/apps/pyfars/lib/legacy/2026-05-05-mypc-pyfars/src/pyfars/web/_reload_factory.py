"""Module-level app for uvicorn ``--reload`` mode.

Reads ``FARS_SERVE_ROOT`` from the environment (set by ``pyfars serve``)
and builds the app on import.
"""
from __future__ import annotations

import os

from pyfars.web.app import build_app

app = build_app(root=os.environ.get("FARS_SERVE_ROOT", "."))
