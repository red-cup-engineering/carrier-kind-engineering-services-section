"""Bearer-token validation for the public ``pyfars mcp`` HTTP transport.

The MCP SDK 1.26 ships a Resource Server scaffold:
:class:`mcp.server.auth.provider.TokenVerifier` is a Protocol that takes a
bearer-token string and returns an :class:`AccessToken` (or None on failure).
:class:`FastMCP` accepts a ``token_verifier=`` kwarg and uses it as the
authoritative validator for the streamable-HTTP transport.

This module supplies the polity's verifier — a JWT verifier that pulls JWKS
from an OIDC issuer (Google by default), validates signature + claims, and
maps the JWT ``sub`` to a substrate ``external-principal`` entity. Subjects
not registered as a principal are rejected unless ``allow_unmapped=True``
(intended for early dev).

Plumbing-wise, the validated principal flows to verb handlers via a
ContextVar — :func:`current_subject` reads it, and the MCP tool wrapper in
:mod:`pyfars.cli.mcp` injects the subject into argv before invoking
``queue-intent`` so the verb itself stays auth-agnostic.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Optional

from mcp.server.auth.middleware.auth_context import get_access_token
from mcp.server.auth.provider import AccessToken, TokenVerifier


class PolityAccessToken(AccessToken):
    """AccessToken extended with the polity-side identity fields.

    The base AccessToken carries the OAuth-spec fields (client_id, scopes,
    expires_at, resource). The polity additionally needs:

    * ``subject`` — the JWT ``sub`` claim, the stable user identifier.
    * ``issuer`` — the validated ``iss`` claim, used to disambiguate
      subjects across multiple IdPs (a Google ``sub`` and a hypothetical
      Authentik ``sub`` may coincide as raw strings).
    * ``email`` — the validated ``email`` claim (if present), for human
      readability in records and dashboards.
    * ``principal_slug`` — the substrate slug of the matching
      ``external-principal`` entity (or None if --auth-allow-unmapped).
    * ``granted_profiles`` — exposure profiles the principal is granted.
    """
    subject: str = ""
    issuer: str = ""
    email: Optional[str] = None
    principal_slug: Optional[str] = None
    granted_profiles: list[str] = []


def current_subject() -> str | None:
    """Return the validated JWT subject for the current MCP request.

    Returns None outside an authenticated request context (e.g. when the
    server is running with ``--auth-disabled`` or the call originated
    from a CLI invocation rather than an MCP tool dispatch).
    """
    tok = get_access_token()
    if tok is None:
        return None
    return getattr(tok, "subject", None) or tok.client_id


def current_principal() -> PolityAccessToken | None:
    """Return the full validated PolityAccessToken or None."""
    tok = get_access_token()
    if isinstance(tok, PolityAccessToken):
        return tok
    return None


# ---------------------------------------------------------------------------
# Principal index — maps (issuer, subject) to substrate principal metadata
# ---------------------------------------------------------------------------


def _walk_principals(root: Path, subdir: str) -> list[tuple[Path, dict]]:
    """Read every kind: external-principal entity in ``root/subdir``."""
    from pyfars.substrate.parse.frontmatter import parse as parse_fm
    base = (root / subdir).resolve()
    if not base.is_dir():
        return []
    rows: list[tuple[Path, dict]] = []
    for path in sorted(base.rglob("*.md")):
        if path.name.startswith("_"):
            continue
        try:
            fm, _ = parse_fm(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not fm or fm.get("kind") != "external-principal":
            continue
        rows.append((path, fm))
    return rows


def load_principal_index(root: Path, subdir: str) -> dict[tuple[str, str], dict]:
    """Build an index keyed by ``(issuer, subject)``.

    Each value is ``{"slug", "granted_profiles", "mapped_to_personnel", "email"}``.
    Re-reading from disk on every token verification is cheap (a handful of
    small files) and keeps the substrate authoritative — operators can add
    or revoke a principal by editing the entity, no server restart.
    """
    out: dict[tuple[str, str], dict] = {}
    for path, fm in _walk_principals(root, subdir):
        sub = str(fm.get("oauth-subject") or "").strip()
        iss = str(fm.get("oauth-issuer") or "").strip()
        if not sub or not iss:
            continue
        out[(iss, sub)] = {
            "slug": path.stem,
            "granted_profiles": list(fm.get("granted-profiles") or []),
            "mapped_to_personnel": fm.get("mapped-to-personnel"),
            "email": fm.get("email"),
        }
    return out


# ---------------------------------------------------------------------------
# OIDC token verifier
# ---------------------------------------------------------------------------


class OIDCTokenVerifier:
    """JWT verifier for any RFC 8414 OIDC discovery-compliant issuer.

    Pulls ``<issuer>/.well-known/openid-configuration`` once at startup,
    fetches the JWKS, and verifies tokens against it locally with authlib.
    Validates ``iss``, ``aud``, ``exp``, ``iat`` claims; rejects on any
    mismatch.

    Optional principal-allowlist: if ``principals_root`` is set, the JWT
    ``sub`` is looked up in the substrate's external-principals dir. A
    subject with no matching entity is rejected (status 401 → "not a
    recognized principal") unless ``allow_unmapped=True``.
    """

    def __init__(
        self,
        *,
        issuer: str,
        audience: str,
        principals_root: Path | None = None,
        principals_subdir: str = "operations/command/group/external-principals",
        allow_unmapped: bool = False,
        leeway_seconds: int = 30,
    ) -> None:
        self.issuer = issuer.rstrip("/")
        self.audience = audience
        self.principals_root = principals_root
        self.principals_subdir = principals_subdir
        self.allow_unmapped = allow_unmapped
        self.leeway = leeway_seconds
        self._jwks: Any | None = None
        self._jwks_uri: str | None = None
        self._discover()

    def _discover(self) -> None:
        import httpx
        url = f"{self.issuer}/.well-known/openid-configuration"
        with httpx.Client(timeout=10.0) as client:
            doc = client.get(url).raise_for_status().json()
        self._jwks_uri = doc.get("jwks_uri")
        if not self._jwks_uri:
            raise RuntimeError(f"OIDC discovery for {self.issuer} returned no jwks_uri")
        self._refresh_jwks()

    def _refresh_jwks(self) -> None:
        import httpx
        from authlib.jose import JsonWebKey
        assert self._jwks_uri is not None
        with httpx.Client(timeout=10.0) as client:
            payload = client.get(self._jwks_uri).raise_for_status().json()
        self._jwks = JsonWebKey.import_key_set(payload)

    async def verify_token(self, token: str) -> AccessToken | None:
        from authlib.jose import jwt
        from authlib.jose.errors import JoseError
        try:
            claims = jwt.decode(token, self._jwks)
            claims.validate(now=int(time.time()), leeway=self.leeway)
        except JoseError:
            return None
        except Exception:
            return None

        iss = str(claims.get("iss", "")).rstrip("/")
        if iss != self.issuer:
            return None
        aud = claims.get("aud")
        if isinstance(aud, list):
            if self.audience not in aud:
                return None
        elif aud != self.audience:
            return None

        sub = str(claims.get("sub") or "")
        email = claims.get("email")
        if not sub:
            return None

        principal_slug: Optional[str] = None
        granted: list[str] = []
        if self.principals_root is not None:
            index = load_principal_index(self.principals_root, self.principals_subdir)
            principal = index.get((iss, sub))
            if principal is None and not self.allow_unmapped:
                return None
            if principal is not None:
                principal_slug = principal["slug"]
                granted = principal["granted_profiles"]

        scopes_claim = claims.get("scope") or ""
        if isinstance(scopes_claim, str):
            scopes = [s for s in scopes_claim.split() if s]
        elif isinstance(scopes_claim, list):
            scopes = [str(s) for s in scopes_claim]
        else:
            scopes = []

        return PolityAccessToken(
            token=token,
            client_id=str(claims.get("azp") or claims.get("aud") or self.audience),
            scopes=scopes,
            expires_at=int(claims["exp"]) if "exp" in claims else None,
            resource=None,
            subject=sub,
            issuer=iss,
            email=email,
            principal_slug=principal_slug,
            granted_profiles=granted,
        )


# Conform to the SDK's Protocol explicitly (cheap runtime guard so a future
# SDK signature change surfaces here rather than as an opaque AttributeError
# inside FastMCP's request loop).
_protocol: TokenVerifier = OIDCTokenVerifier  # type: ignore[assignment]
