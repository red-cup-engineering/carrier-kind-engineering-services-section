"""Polity-side OAuth Authorization Server for the public ``pyfars mcp`` HTTP transport.

The MCP SDK 1.26 ships an :class:`OAuthAuthorizationServerProvider` Protocol;
when ``FastMCP`` is constructed with ``auth_server_provider=<provider>`` it
mounts the standard endpoints (``/.well-known/oauth-authorization-server``,
``/register``, ``/authorize``, ``/token``, optionally ``/revoke``) and routes
them through the provider.

This module supplies that provider for the polity. It runs pyfars as a
**federated** AS:

* Clients (Claude.ai, ChatGPT, MCP Inspector) speak OAuth to *us*. We do the
  RFC 7591 dynamic client registration so each client gets its own
  ``client_id``. We mint our own opaque access + refresh tokens.
* For the *user authentication* step we redirect the browser to **Google**
  (the upstream OIDC IdP). When Google calls our callback we validate the
  ID token, extract the ``sub``, look it up against the substrate's
  ``external-principal`` entities, and only then mint our authorization code.

Only the federated ID-token validation reaches Google; the bearer token the
client uses against ``/mcp`` is ours, opaque, scoped to a known principal,
and revocable.

Persistence: the DCR client registry persists to ``<root>/.fars/oauth/clients.json``
so MCP clients survive a server restart. Authorization codes (short-lived),
access tokens, and refresh tokens are kept in memory; a restart forces clients
to re-do the OAuth dance, which is harmless for browser-driven MCP clients.
"""
from __future__ import annotations

import asyncio
import json
import secrets
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

from mcp.server.auth.provider import (
    AccessToken,
    AuthorizationCode,
    AuthorizationParams,
    AuthorizeError,
    OAuthAuthorizationServerProvider,
    RefreshToken,
    TokenVerifier,
    construct_redirect_uri,
)
from mcp.shared.auth import OAuthClientInformationFull, OAuthToken

from pyfars.cli._mcp_auth import (
    PolityAccessToken,
    load_principal_index,
)


_DEFAULT_ACCESS_TTL_SECONDS = 3600
_DEFAULT_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days
_DEFAULT_CODE_TTL_SECONDS = 300


# ---------------------------------------------------------------------------
# Stored token shapes — extend the SDK base models with the polity identity
# fields so a successful ``load_access_token`` produces a ``PolityAccessToken``
# the existing ``_inject_auth_subject`` already knows how to read.
# ---------------------------------------------------------------------------


class PolityAuthorizationCode(AuthorizationCode):
    subject: str = ""
    issuer: str = ""
    email: Optional[str] = None
    principal_slug: Optional[str] = None
    granted_profiles: list[str] = []


class PolityRefreshToken(RefreshToken):
    subject: str = ""
    issuer: str = ""
    email: Optional[str] = None
    principal_slug: Optional[str] = None
    granted_profiles: list[str] = []


@dataclass
class _PendingAuthorization:
    """The /authorize request we parked while the user is at Google.

    Indexed by the ``state`` we generate for the upstream Google request.
    On the way back through ``/oauth/google/callback`` we use this to
    reconstruct the original client redirect — Google's own ``state`` is
    opaque to us in this direction.
    """
    client_id: str
    redirect_uri: str
    redirect_uri_provided_explicitly: bool
    scopes: list[str]
    code_challenge: str
    original_state: str | None
    resource: str | None
    created_at: float = field(default_factory=time.time)


# ---------------------------------------------------------------------------
# Google federation — minimal OIDC relying-party for the upstream leg.
# ---------------------------------------------------------------------------


class GoogleFederation:
    """Upstream OIDC relying-party for Google.

    Constructor performs OIDC discovery once (``accounts.google.com/.well-known/...``)
    and caches the JWKS. ``build_authorize_url`` produces the Google URL we
    redirect the user's browser to. ``exchange_code`` posts the auth code to
    Google's token endpoint, decodes and validates the ID token, and returns
    ``(issuer, subject, email)`` — the three claims we trust for principal
    lookup.
    """

    DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

    def __init__(
        self,
        *,
        client_id: str,
        client_secret: str,
        callback_url: str,
        scopes: tuple[str, ...] = ("openid", "email"),
        leeway_seconds: int = 30,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.callback_url = callback_url
        self.scopes = scopes
        self.leeway = leeway_seconds
        self._authorization_endpoint: str | None = None
        self._token_endpoint: str | None = None
        self._issuer: str | None = None
        self._jwks = None
        self._discover()

    def _discover(self) -> None:
        import httpx
        with httpx.Client(timeout=10.0) as client:
            doc = client.get(self.DISCOVERY_URL).raise_for_status().json()
        self._authorization_endpoint = doc["authorization_endpoint"]
        self._token_endpoint = doc["token_endpoint"]
        self._issuer = doc["issuer"].rstrip("/")
        jwks_uri = doc["jwks_uri"]
        from authlib.jose import JsonWebKey
        with httpx.Client(timeout=10.0) as client:
            payload = client.get(jwks_uri).raise_for_status().json()
        self._jwks = JsonWebKey.import_key_set(payload)

    @property
    def issuer(self) -> str:
        assert self._issuer is not None
        return self._issuer

    def build_authorize_url(self, state: str) -> str:
        assert self._authorization_endpoint is not None
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.callback_url,
            "response_type": "code",
            "scope": " ".join(self.scopes),
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
        return f"{self._authorization_endpoint}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> tuple[str, str, str | None]:
        """POST to Google's token endpoint, validate the returned ID token.

        Returns ``(issuer, subject, email)``. Raises ``AuthorizeError`` on any
        validation failure so the caller can surface a clean OAuth error to
        the client.
        """
        import httpx
        from authlib.jose import jwt
        from authlib.jose.errors import JoseError

        assert self._token_endpoint is not None
        data = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.callback_url,
            "grant_type": "authorization_code",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(self._token_endpoint, data=data)
        if resp.status_code != 200:
            raise AuthorizeError(
                error="server_error",
                error_description=f"Google token exchange failed: {resp.status_code} {resp.text[:200]}",
            )
        body = resp.json()
        id_token = body.get("id_token")
        if not id_token:
            raise AuthorizeError(
                error="server_error",
                error_description="Google token response had no id_token",
            )
        try:
            claims = jwt.decode(id_token, self._jwks)
            claims.validate(now=int(time.time()), leeway=self.leeway)
        except JoseError as exc:
            raise AuthorizeError(
                error="server_error",
                error_description=f"Google ID token invalid: {exc}",
            )

        iss = str(claims.get("iss", "")).rstrip("/")
        if iss != self.issuer:
            raise AuthorizeError(
                error="server_error",
                error_description=f"Google ID token issuer mismatch: {iss!r}",
            )
        aud = claims.get("aud")
        if isinstance(aud, list):
            if self.client_id not in aud:
                raise AuthorizeError(
                    error="server_error",
                    error_description="Google ID token audience mismatch",
                )
        elif aud != self.client_id:
            raise AuthorizeError(
                error="server_error",
                error_description="Google ID token audience mismatch",
            )

        sub = str(claims.get("sub") or "")
        if not sub:
            raise AuthorizeError(
                error="server_error",
                error_description="Google ID token missing sub",
            )
        email = claims.get("email")
        return iss, sub, email


# ---------------------------------------------------------------------------
# Client registry — DCR-issued clients persist to disk so MCP clients
# survive a server restart without re-registering.
# ---------------------------------------------------------------------------


class _ClientStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = asyncio.Lock()
        self._data: dict[str, OAuthClientInformationFull] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        for cid, blob in raw.items():
            try:
                self._data[cid] = OAuthClientInformationFull.model_validate(blob)
            except Exception:
                continue

    def _flush(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        out = {cid: c.model_dump(mode="json") for cid, c in self._data.items()}
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(out, indent=2, sort_keys=True), encoding="utf-8")
        tmp.replace(self.path)

    async def add(self, client: OAuthClientInformationFull) -> None:
        async with self._lock:
            assert client.client_id is not None
            self._data[client.client_id] = client
            self._flush()

    async def get(self, client_id: str) -> OAuthClientInformationFull | None:
        async with self._lock:
            return self._data.get(client_id)


# ---------------------------------------------------------------------------
# The provider itself.
# ---------------------------------------------------------------------------


class PolityOAuthProvider(
    OAuthAuthorizationServerProvider[
        PolityAuthorizationCode, PolityRefreshToken, PolityAccessToken
    ]
):
    """OAuthAuthorizationServerProvider implementation for the polity.

    Identity is federated to Google: ``authorize`` builds a Google authorize
    URL keyed by a state we own; the federated callback (registered by
    :func:`pyfars.cli.mcp.main` as a custom Starlette route) calls
    :meth:`complete_google_callback`, which exchanges the upstream code for
    the user's Google ``sub``, looks up the principal, and mints our auth
    code.
    """

    def __init__(
        self,
        *,
        federation: GoogleFederation,
        principals_root: Path,
        principals_subdir: str = "operations/command/group/external-principals",
        allow_unmapped: bool = False,
        state_dir: Path,
        scopes_supported: list[str] | None = None,
        access_token_ttl_seconds: int = _DEFAULT_ACCESS_TTL_SECONDS,
        refresh_token_ttl_seconds: int = _DEFAULT_REFRESH_TTL_SECONDS,
        code_ttl_seconds: int = _DEFAULT_CODE_TTL_SECONDS,
    ) -> None:
        self.federation = federation
        self.principals_root = principals_root
        self.principals_subdir = principals_subdir
        self.allow_unmapped = allow_unmapped
        self.scopes_supported = scopes_supported or []
        self.access_token_ttl = access_token_ttl_seconds
        self.refresh_token_ttl = refresh_token_ttl_seconds
        self.code_ttl = code_ttl_seconds

        self._clients = _ClientStore(state_dir / "clients.json")
        self._pending: dict[str, _PendingAuthorization] = {}
        self._codes: dict[str, PolityAuthorizationCode] = {}
        self._access: dict[str, PolityAccessToken] = {}
        self._refresh: dict[str, PolityRefreshToken] = {}
        # Reverse index: refresh-token's bound access token, used so revoking
        # a refresh token also kills the access token it last minted.
        self._refresh_to_access: dict[str, str] = {}

    # ----- DCR ---------------------------------------------------------------

    async def get_client(self, client_id: str) -> OAuthClientInformationFull | None:
        return await self._clients.get(client_id)

    async def register_client(self, client_info: OAuthClientInformationFull) -> None:
        if client_info.client_id is None:
            client_info.client_id = secrets.token_urlsafe(24)
        if client_info.client_secret is None and client_info.token_endpoint_auth_method != "none":
            client_info.client_secret = secrets.token_urlsafe(32)
        if client_info.client_id_issued_at is None:
            client_info.client_id_issued_at = int(time.time())
        await self._clients.add(client_info)

    # ----- /authorize → Google redirect --------------------------------------

    async def authorize(
        self,
        client: OAuthClientInformationFull,
        params: AuthorizationParams,
    ) -> str:
        # Park the original /authorize call keyed by a state we hand to Google.
        # Google echoes the state back at our callback; that's how we re-find
        # this record and complete the original request.
        google_state = secrets.token_urlsafe(24)
        assert client.client_id is not None
        self._pending[google_state] = _PendingAuthorization(
            client_id=client.client_id,
            redirect_uri=str(params.redirect_uri),
            redirect_uri_provided_explicitly=params.redirect_uri_provided_explicitly,
            scopes=list(params.scopes or []),
            code_challenge=params.code_challenge,
            original_state=params.state,
            resource=params.resource,
        )
        return self.federation.build_authorize_url(google_state)

    async def complete_google_callback(
        self,
        google_state: str,
        google_code: str,
    ) -> str:
        """Finish the federated leg: validate Google's response, mint our code,
        return the URL to redirect the browser back to the original client.

        Called from the custom ``/oauth/google/callback`` Starlette route.
        """
        pending = self._pending.pop(google_state, None)
        if pending is None:
            raise AuthorizeError(
                error="invalid_request",
                error_description="unknown or expired state",
            )

        iss, sub, email = await self.federation.exchange_code(google_code)

        principal_slug: str | None = None
        granted_profiles: list[str] = []
        index = load_principal_index(self.principals_root, self.principals_subdir)
        principal = index.get((iss, sub))
        if principal is None:
            if not self.allow_unmapped:
                # Bounce the client back with access_denied per RFC 6749 §4.1.2.1.
                return construct_redirect_uri(
                    pending.redirect_uri,
                    error="access_denied",
                    error_description="not a recognized principal",
                    state=pending.original_state,
                )
        else:
            principal_slug = principal["slug"]
            granted_profiles = principal["granted_profiles"]

        code = secrets.token_urlsafe(32)
        from pydantic import AnyUrl
        self._codes[code] = PolityAuthorizationCode(
            code=code,
            scopes=pending.scopes,
            expires_at=time.time() + self.code_ttl,
            client_id=pending.client_id,
            code_challenge=pending.code_challenge,
            redirect_uri=AnyUrl(pending.redirect_uri),
            redirect_uri_provided_explicitly=pending.redirect_uri_provided_explicitly,
            resource=pending.resource,
            subject=sub,
            issuer=iss,
            email=email,
            principal_slug=principal_slug,
            granted_profiles=granted_profiles,
        )
        return construct_redirect_uri(
            pending.redirect_uri,
            code=code,
            state=pending.original_state,
        )

    # ----- /token (auth code grant) -----------------------------------------

    async def load_authorization_code(
        self,
        client: OAuthClientInformationFull,
        authorization_code: str,
    ) -> PolityAuthorizationCode | None:
        code = self._codes.get(authorization_code)
        if code is None:
            return None
        if code.client_id != client.client_id:
            return None
        if code.expires_at < time.time():
            self._codes.pop(authorization_code, None)
            return None
        return code

    async def exchange_authorization_code(
        self,
        client: OAuthClientInformationFull,
        authorization_code: PolityAuthorizationCode,
    ) -> OAuthToken:
        # PKCE was already verified by the SDK's TokenHandler before we got here.
        self._codes.pop(authorization_code.code, None)
        return self._issue_pair(
            client_id=authorization_code.client_id,
            scopes=authorization_code.scopes,
            subject=authorization_code.subject,
            issuer=authorization_code.issuer,
            email=authorization_code.email,
            principal_slug=authorization_code.principal_slug,
            granted_profiles=authorization_code.granted_profiles,
            resource=authorization_code.resource,
        )

    # ----- /token (refresh grant) -------------------------------------------

    async def load_refresh_token(
        self,
        client: OAuthClientInformationFull,
        refresh_token: str,
    ) -> PolityRefreshToken | None:
        rt = self._refresh.get(refresh_token)
        if rt is None:
            return None
        if rt.client_id != client.client_id:
            return None
        if rt.expires_at is not None and rt.expires_at < time.time():
            self._refresh.pop(refresh_token, None)
            return None
        return rt

    async def exchange_refresh_token(
        self,
        client: OAuthClientInformationFull,
        refresh_token: PolityRefreshToken,
        scopes: list[str],
    ) -> OAuthToken:
        # Rotate: invalidate the presented refresh token (and its prior access
        # token), then mint a new pair. RFC 6749 §6 + the SDK's own guidance.
        self._refresh.pop(refresh_token.token, None)
        old_access = self._refresh_to_access.pop(refresh_token.token, None)
        if old_access is not None:
            self._access.pop(old_access, None)

        granted = scopes if scopes else refresh_token.scopes
        return self._issue_pair(
            client_id=refresh_token.client_id,
            scopes=granted,
            subject=refresh_token.subject,
            issuer=refresh_token.issuer,
            email=refresh_token.email,
            principal_slug=refresh_token.principal_slug,
            granted_profiles=refresh_token.granted_profiles,
            resource=None,
        )

    # ----- bearer-token validation ------------------------------------------

    async def load_access_token(self, token: str) -> PolityAccessToken | None:
        at = self._access.get(token)
        if at is None:
            return None
        if at.expires_at is not None and at.expires_at < int(time.time()):
            self._access.pop(token, None)
            return None
        return at

    async def revoke_token(self, token: AccessToken | RefreshToken) -> None:
        # The SDK passes either an AccessToken or a RefreshToken instance.
        # Best-effort: drop both halves of the pair so a stolen pair doesn't
        # remain partially live.
        self._access.pop(token.token, None)
        rt = self._refresh.pop(token.token, None)
        if rt is not None:
            paired = self._refresh_to_access.pop(token.token, None)
            if paired is not None:
                self._access.pop(paired, None)
        else:
            for refresh_str, access_str in list(self._refresh_to_access.items()):
                if access_str == token.token:
                    self._refresh.pop(refresh_str, None)
                    self._refresh_to_access.pop(refresh_str, None)

    # ----- token verifier accessor ------------------------------------------

    def token_verifier(self) -> TokenVerifier:
        """Return a TokenVerifier that consults this provider's access store.

        FastMCP, when given ``auth_server_provider=``, falls back to its own
        ``ProviderTokenVerifier`` by default. We expose this explicitly so
        tests (and future RS-only deployments) can mount the same verifier.
        """
        provider = self

        class _Verifier:
            async def verify_token(self, token: str) -> AccessToken | None:
                return await provider.load_access_token(token)

        return _Verifier()

    # ----- internals --------------------------------------------------------

    def _issue_pair(
        self,
        *,
        client_id: str,
        scopes: list[str],
        subject: str,
        issuer: str,
        email: str | None,
        principal_slug: str | None,
        granted_profiles: list[str],
        resource: str | None,
    ) -> OAuthToken:
        access_token = secrets.token_urlsafe(32)
        refresh_token = secrets.token_urlsafe(32)
        now = int(time.time())
        access_expires = now + self.access_token_ttl
        refresh_expires = now + self.refresh_token_ttl

        self._access[access_token] = PolityAccessToken(
            token=access_token,
            client_id=client_id,
            scopes=scopes,
            expires_at=access_expires,
            resource=resource,
            subject=subject,
            issuer=issuer,
            email=email,
            principal_slug=principal_slug,
            granted_profiles=granted_profiles,
        )
        self._refresh[refresh_token] = PolityRefreshToken(
            token=refresh_token,
            client_id=client_id,
            scopes=scopes,
            expires_at=refresh_expires,
            subject=subject,
            issuer=issuer,
            email=email,
            principal_slug=principal_slug,
            granted_profiles=granted_profiles,
        )
        self._refresh_to_access[refresh_token] = access_token

        return OAuthToken(
            access_token=access_token,
            token_type="Bearer",
            expires_in=self.access_token_ttl,
            scope=" ".join(scopes) if scopes else None,
            refresh_token=refresh_token,
        )


# ---------------------------------------------------------------------------
# Custom Starlette route — Google's redirect target.
# ---------------------------------------------------------------------------


def make_google_callback_route(provider: PolityOAuthProvider):
    """Build the async Starlette handler for ``/oauth/google/callback``.

    Returned as a plain async callable; the caller registers it via
    :meth:`FastMCP.custom_route`.
    """
    from starlette.requests import Request
    from starlette.responses import PlainTextResponse, RedirectResponse

    async def handler(request: Request):
        params = request.query_params
        if "error" in params:
            # Google bounced — e.g. the user clicked Cancel. We don't have the
            # original client redirect cached after popping the pending entry,
            # so the cleanest signal is a plain text response. The browser
            # tab is the affordance.
            return PlainTextResponse(
                f"Google authorization failed: {params.get('error')!r} "
                f"{params.get('error_description', '')}",
                status_code=400,
            )
        state = params.get("state")
        code = params.get("code")
        if not state or not code:
            return PlainTextResponse(
                "missing state or code in Google callback",
                status_code=400,
            )
        try:
            redirect_to = await provider.complete_google_callback(state, code)
        except AuthorizeError as exc:
            return PlainTextResponse(
                f"authorization failed: {exc.error} {exc.error_description or ''}",
                status_code=400,
            )
        return RedirectResponse(redirect_to, status_code=302)

    return handler
