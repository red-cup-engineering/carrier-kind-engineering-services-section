"""Per-principal verb gating in the MCP tool surface.

The MCP server exposes a superset of verbs (set by --expose at startup),
but each authenticated principal carries its own ``granted-profiles``
list which narrows what they can actually invoke. ``_authorize_verb``
is the gate; this test exercises it directly with mocked principals.
"""
from __future__ import annotations

from contextlib import contextmanager

from pyfars.cli import _mcp_auth
from pyfars.cli._mcp_auth import PolityAccessToken
from pyfars.cli.mcp import EXPOSE_PROFILES, _authorize_verb


@contextmanager
def _principal(profiles: list[str]):
    """Install a mocked principal as the current MCP request's auth context."""
    tok = PolityAccessToken(
        token="t",
        client_id="c",
        scopes=[],
        expires_at=None,
        subject="42",
        issuer="https://accounts.google.com",
        principal_slug="someone",
        granted_profiles=profiles,
    )
    saved = _mcp_auth.get_access_token
    _mcp_auth.get_access_token = lambda: tok  # type: ignore[assignment]
    try:
        yield
    finally:
        _mcp_auth.get_access_token = saved  # type: ignore[assignment]


def test_no_principal_means_no_gating():
    # Outside an MCP request context (stdio, --auth-disabled, CLI call).
    assert _authorize_verb("commit") is None


def test_empty_granted_profiles_means_no_gating():
    # Mapped principal but no profiles assigned: server-level --expose
    # remains the only gate (preserves dev-mode behavior).
    with _principal([]):
        assert _authorize_verb("commit") is None


def test_read_only_principal_allowed_for_read_verb():
    with _principal(["read-only"]):
        assert _authorize_verb("show") is None
        assert _authorize_verb("search") is None


def test_read_only_principal_denied_for_write_verb():
    with _principal(["read-only"]):
        msg = _authorize_verb("queue-intent")
        assert msg is not None
        assert "forbidden" in msg
        assert "queue-intent" in msg
        assert "read-only" in msg


def test_remote_rw_narrow_principal_can_queue_intent():
    with _principal(["remote-rw-narrow"]):
        assert _authorize_verb("queue-intent") is None
        # Yet narrow excludes read-only-only verbs like `agents`.
        assert _authorize_verb("agents") is not None


def test_remote_rw_broad_principal_covers_both_sets():
    assert "remote-rw-broad" in EXPOSE_PROFILES
    with _principal(["remote-rw-broad"]):
        assert _authorize_verb("queue-intent") is None
        assert _authorize_verb("agents") is None
        # Still excludes verbs not in either source profile (e.g. commit).
        assert _authorize_verb("commit") is not None


def test_all_profile_is_unconditional():
    with _principal(["all"]):
        assert _authorize_verb("commit") is None
        assert _authorize_verb("anything") is None


def test_unknown_profile_does_not_grant():
    with _principal(["typoed-profile"]):
        msg = _authorize_verb("show")
        assert msg is not None
        assert "typoed-profile" in msg


def test_multiple_profiles_union():
    # Principal with two non-overlapping narrow profiles gets the union.
    with _principal(["read-only", "remote-rw-narrow"]):
        assert _authorize_verb("queue-intent") is None  # from rw-narrow
        assert _authorize_verb("agents") is None        # from read-only
        assert _authorize_verb("commit") is not None    # neither
