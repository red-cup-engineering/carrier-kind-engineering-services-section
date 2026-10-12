"""FARS web service.

A FastAPI application that exposes the FARS programmatic API as a
REST surface (auto-OpenAPI at ``/docs``) plus a small browser UI for
reading the corpus (stats, list, show, search, context) and inspecting
the substrate's runtime status (harnesses installed, MCP server
launchable, skill/verb counts).

Entry point: ``pyfars serve``. The app is built by ``app.build_app(root)``
so the corpus root is configurable per-process.
"""
from pyfars.web.app import build_app

__all__ = ["build_app"]
