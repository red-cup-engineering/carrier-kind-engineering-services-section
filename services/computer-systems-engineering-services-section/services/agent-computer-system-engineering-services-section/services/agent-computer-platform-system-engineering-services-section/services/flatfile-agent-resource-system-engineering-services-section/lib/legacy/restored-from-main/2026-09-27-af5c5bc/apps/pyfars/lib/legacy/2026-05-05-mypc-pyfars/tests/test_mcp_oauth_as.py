"""Tests for the polity OAuth Authorization Server provider.

The federated leg (Google) is replaced with a stub so the tests don't hit
the network. Everything else — the SDK Protocol surface, the substrate
``external-principal`` lookup, code/token rotation — is exercised against
the real provider.
"""
from __future__ import annotations

import asyncio
import time
from pathlib import Path

import pytest
from pydantic import AnyUrl

from mcp.server.auth.provider import AuthorizationParams
from mcp.shared.auth import OAuthClientInformationFull

from pyfars.cli._mcp_auth import PolityAccessToken
from pyfars.cli._mcp_oauth_as import (
    PolityOAuthProvider,
    PolityRefreshToken,
)


# ---------------------------------------------------------------------------
# Test scaffolding
# ---------------------------------------------------------------------------


class _StubFederation:
    """Stand-in for GoogleFederation. No network, deterministic claims."""

    def __init__(self, *, issuer="https://accounts.google.com", sub="115211101363626662058", email="captain@example.com"):
        self._issuer = issuer
        self._sub = sub
        self._email = email
        self.last_state: str | None = None

    @property
    def issuer(self) -> str:
        return self._issuer

    def build_authorize_url(self, state: str) -> str:
        self.last_state = state
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}"

    async def exchange_code(self, code: str) -> tuple[str, str, str | None]:
        if code == "bad-code":
            from mcp.server.auth.provider import AuthorizeError
            raise AuthorizeError(error="server_error", error_description="stub")
        return self._issuer, self._sub, self._email


def _principal_root(tmp: Path, *, sub="115211101363626662058", iss="https://accounts.google.com") -> Path:
    """Build a substrate root carrying one external-principal entity."""
    pdir = tmp / "operations" / "command" / "group" / "external-principals"
    pdir.mkdir(parents=True, exist_ok=True)
    (pdir / "captain.md").write_text(
        f"---\n"
        f"title: captain\n"
        f"kind: external-principal\n"
        f"oauth-issuer: {iss}\n"
        f"oauth-subject: '{sub}'\n"
        f"email: captain@example.com\n"
        f"granted-profiles:\n- remote-rw-narrow\n"
        f"---\n",
        encoding="utf-8",
    )
    return tmp


def _make_provider(tmp: Path, *, allow_unmapped=False, federation=None) -> PolityOAuthProvider:
    state_dir = tmp / ".fars" / "oauth"
    fed = federation or _StubFederation()
    return PolityOAuthProvider(
        federation=fed,
        principals_root=tmp,
        allow_unmapped=allow_unmapped,
        state_dir=state_dir,
    )


def _client(redirect="https://client.example/callback") -> OAuthClientInformationFull:
    return OAuthClientInformationFull(
        redirect_uris=[AnyUrl(redirect)],
        token_endpoint_auth_method="client_secret_basic",
    )


def _params(redirect="https://client.example/callback", state="orig-state-XYZ") -> AuthorizationParams:
    return AuthorizationParams(
        state=state,
        scopes=["read"],
        code_challenge="abcdefABCDEF0123456789-_zzzz",  # opaque to the provider
        redirect_uri=AnyUrl(redirect),
        redirect_uri_provided_explicitly=True,
        resource=None,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_register_persists_across_provider_instances(tmp_path: Path):
    p1 = _make_provider(_principal_root(tmp_path))
    client = _client()
    asyncio.run(p1.register_client(client))
    assert client.client_id is not None
    assert client.client_secret is not None
    cid = client.client_id

    p2 = _make_provider(_principal_root(tmp_path))
    loaded = asyncio.run(p2.get_client(cid))
    assert loaded is not None
    assert loaded.client_id == cid


def test_full_auth_code_grant_to_bearer(tmp_path: Path):
    provider = _make_provider(_principal_root(tmp_path))
    client = _client()
    asyncio.run(provider.register_client(client))

    google_url = asyncio.run(provider.authorize(client, _params()))
    assert google_url.startswith("https://accounts.google.com/")
    google_state = provider.federation.last_state
    assert google_state and "state=" + google_state in google_url

    redirect_back = asyncio.run(provider.complete_google_callback(google_state, "good-code"))
    assert redirect_back.startswith("https://client.example/callback?")
    assert "state=orig-state-XYZ" in redirect_back
    code = redirect_back.split("code=", 1)[1].split("&", 1)[0]

    loaded_code = asyncio.run(provider.load_authorization_code(client, code))
    assert loaded_code is not None
    assert loaded_code.subject == "115211101363626662058"
    assert loaded_code.principal_slug == "captain"
    assert "remote-rw-narrow" in loaded_code.granted_profiles

    token = asyncio.run(provider.exchange_authorization_code(client, loaded_code))
    assert token.access_token and token.refresh_token
    # Code is single-use.
    assert asyncio.run(provider.load_authorization_code(client, code)) is None

    at = asyncio.run(provider.load_access_token(token.access_token))
    assert isinstance(at, PolityAccessToken)
    assert at.subject == "115211101363626662058"
    assert at.principal_slug == "captain"
    assert "remote-rw-narrow" in at.granted_profiles


def test_unmapped_principal_is_denied_when_allow_unmapped_false(tmp_path: Path):
    fed = _StubFederation(sub="999-not-in-substrate")
    provider = _make_provider(_principal_root(tmp_path), federation=fed)
    client = _client()
    asyncio.run(provider.register_client(client))

    asyncio.run(provider.authorize(client, _params()))
    state = provider.federation.last_state
    assert state is not None
    redirect = asyncio.run(provider.complete_google_callback(state, "good-code"))
    # RFC 6749 access_denied bounce.
    assert "error=access_denied" in redirect
    assert "code=" not in redirect


def test_unmapped_principal_is_allowed_when_flag_set(tmp_path: Path):
    fed = _StubFederation(sub="999-not-in-substrate")
    provider = _make_provider(_principal_root(tmp_path), allow_unmapped=True, federation=fed)
    client = _client()
    asyncio.run(provider.register_client(client))

    asyncio.run(provider.authorize(client, _params()))
    state = provider.federation.last_state
    assert state is not None
    redirect = asyncio.run(provider.complete_google_callback(state, "good-code"))
    assert "code=" in redirect
    code = redirect.split("code=", 1)[1].split("&", 1)[0]
    loaded = asyncio.run(provider.load_authorization_code(client, code))
    assert loaded is not None
    assert loaded.subject == "999-not-in-substrate"
    assert loaded.principal_slug is None
    assert loaded.granted_profiles == []


def test_unknown_state_rejected(tmp_path: Path):
    from mcp.server.auth.provider import AuthorizeError
    provider = _make_provider(_principal_root(tmp_path))
    with pytest.raises(AuthorizeError):
        asyncio.run(provider.complete_google_callback("never-issued", "good-code"))


def test_authorization_code_bound_to_client(tmp_path: Path):
    provider = _make_provider(_principal_root(tmp_path))
    client_a = _client()
    client_b = _client(redirect="https://other.example/cb")
    asyncio.run(provider.register_client(client_a))
    asyncio.run(provider.register_client(client_b))

    asyncio.run(provider.authorize(client_a, _params()))
    state = provider.federation.last_state
    assert state is not None
    redirect = asyncio.run(provider.complete_google_callback(state, "good-code"))
    code = redirect.split("code=", 1)[1].split("&", 1)[0]

    # client_b cannot redeem client_a's code.
    assert asyncio.run(provider.load_authorization_code(client_b, code)) is None


def test_refresh_token_rotation(tmp_path: Path):
    provider = _make_provider(_principal_root(tmp_path))
    client = _client()
    asyncio.run(provider.register_client(client))
    asyncio.run(provider.authorize(client, _params()))
    state = provider.federation.last_state
    assert state is not None
    redirect = asyncio.run(provider.complete_google_callback(state, "good-code"))
    code = redirect.split("code=", 1)[1].split("&", 1)[0]
    loaded = asyncio.run(provider.load_authorization_code(client, code))
    token1 = asyncio.run(provider.exchange_authorization_code(client, loaded))

    rt = asyncio.run(provider.load_refresh_token(client, token1.refresh_token))
    assert isinstance(rt, PolityRefreshToken)
    token2 = asyncio.run(provider.exchange_refresh_token(client, rt, scopes=[]))
    assert token2.access_token != token1.access_token
    assert token2.refresh_token != token1.refresh_token
    # Old access token invalidated; old refresh token gone.
    assert asyncio.run(provider.load_access_token(token1.access_token)) is None
    assert asyncio.run(provider.load_refresh_token(client, token1.refresh_token)) is None
    # New ones live.
    assert asyncio.run(provider.load_access_token(token2.access_token)) is not None


def test_revoke_drops_pair(tmp_path: Path):
    provider = _make_provider(_principal_root(tmp_path))
    client = _client()
    asyncio.run(provider.register_client(client))
    asyncio.run(provider.authorize(client, _params()))
    state = provider.federation.last_state
    redirect = asyncio.run(provider.complete_google_callback(state, "good-code"))
    code = redirect.split("code=", 1)[1].split("&", 1)[0]
    loaded = asyncio.run(provider.load_authorization_code(client, code))
    token = asyncio.run(provider.exchange_authorization_code(client, loaded))

    rt = asyncio.run(provider.load_refresh_token(client, token.refresh_token))
    asyncio.run(provider.revoke_token(rt))
    assert asyncio.run(provider.load_access_token(token.access_token)) is None
    assert asyncio.run(provider.load_refresh_token(client, token.refresh_token)) is None


def test_access_token_expiry(tmp_path: Path):
    provider = _make_provider(_principal_root(tmp_path))
    provider.access_token_ttl = 0  # mint-and-expire
    client = _client()
    asyncio.run(provider.register_client(client))
    asyncio.run(provider.authorize(client, _params()))
    state = provider.federation.last_state
    redirect = asyncio.run(provider.complete_google_callback(state, "good-code"))
    code = redirect.split("code=", 1)[1].split("&", 1)[0]
    loaded = asyncio.run(provider.load_authorization_code(client, code))
    token = asyncio.run(provider.exchange_authorization_code(client, loaded))

    # expires_at is now() + 0 → already expired by the time we load.
    time.sleep(1)
    assert asyncio.run(provider.load_access_token(token.access_token)) is None
