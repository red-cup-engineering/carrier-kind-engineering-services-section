"""``pyfars mcp [--root R] [--transport T]`` — start an MCP server exposing every corpus verb.

Each top-level verb becomes an MCP tool. Verbs that have a ``SPEC``
expose typed tool parameters (an MCP client gets a proper JSON Schema
describing each flag); verbs that haven't migrated yet fall back to a
single ``args_str`` parameter (space-separated argv).

Requires the packaged ``mcp`` Python dependency. When the package is
missing, points the operator back to the Nix devshell/package and exits 2.

Two transports are supported:

* ``--transport stdio`` (default) — the server speaks MCP over stdin/stdout.
  Appropriate for being launched as a subprocess by an MCP-aware agent
  runtime (Claude Desktop, etc.).
* ``--transport http`` — the server runs as a long-lived HTTP service
  speaking MCP's *Streamable HTTP* transport at ``/mcp`` on
  ``--host``:``--port`` (default ``127.0.0.1:8001``). Appropriate for
  network-attached MCP clients and for sharing one server among many
  callers.
* ``--transport sse`` — legacy Server-Sent-Events transport, same host/port
  shape, served at ``/sse``. Kept for clients that haven't migrated to
  Streamable HTTP yet.
"""
from __future__ import annotations

import importlib
import inspect
import io
import shlex
import sys
from contextlib import redirect_stdout
from pathlib import Path
from typing import Callable, List, Optional

from pyfars.cli._runner import as_directory
from pyfars.spec import Parameter, VerbSpec, kwargs_from_dict, make_argparse


def _split_args(args_str: str) -> list[str]:
    """Shell-style argv splitter that preserves quoted/spaced tokens.

    Returns ``[]`` for empty input. On a quoting error, falls back to
    ``str.split()`` so a malformed quote never makes a tool unreachable.
    """
    if not args_str:
        return []
    try:
        return shlex.split(args_str)
    except ValueError:
        return args_str.split()


_WIRE_PRIMITIVES = (str, int, float, bool)


def _wire_type(t) -> type:
    """Map a Python ``type`` (or callable parser) to a JSON-Schema-safe type.

    Pydantic / FastMCP introspect annotations to build per-parameter JSON
    schemas. Only a small set of primitive types (``str``, ``int``, ``float``,
    ``bool``) round-trips reliably across the MCP wire. Anything else —
    ``Path``, ``Optional`` parser callables like ``_parse_kv`` whose
    ``Parameter.type`` is a function rather than a class, or any custom class
    with no JSON representation — is collapsed to ``str``. The verb's own
    ``kwargs_from_dict`` then coerces back to the rich Python type before
    the verb runs.
    """
    if isinstance(t, type) and issubclass(t, _WIRE_PRIMITIVES):
        return t
    return str


def _wire_default(d):
    """Normalize a default value to a wire-safe representation.

    Mirrors :func:`_wire_type`: ``Path`` defaults become their string form so
    the value matches the announced ``str`` annotation, and any other
    non-primitive default is also coerced via ``str()``.
    """
    if d is None or isinstance(d, _WIRE_PRIMITIVES):
        return d
    return str(d)


def _typed_tool_signature(sp: VerbSpec) -> tuple[inspect.Signature, dict]:
    """Build a real ``inspect.Signature`` and annotations dict from a VerbSpec.

    FastMCP introspects each tool function via ``inspect.signature`` and
    ``typing.get_type_hints`` to generate the tool's JSON Schema. A bare
    ``def tool(**kwargs)`` collapses to a single required ``kwargs`` field —
    unusable from MCP clients. Building an explicit per-parameter signature
    lets each verb advertise its real parameter shape.

    Only wire-safe primitive types are advertised in annotations
    (see :func:`_wire_type`); ``Path`` and custom parser callables (e.g.
    ``_parse_kv`` for ``--set key=value``) are projected to ``str`` so
    pydantic / FastMCP can introspect them, with reconstruction handled by
    each verb's own ``kwargs_from_dict``.
    """
    sig_params: list[inspect.Parameter] = []
    annotations: dict = {}
    for p in sp.parameters:
        if p.kind == "store_true":
            ann = bool
            default = False
        elif p.kind == "append":
            elem = _wire_type(p.type) if p.type is not None else str
            ann = Optional[List[elem]]
            default = None
        elif p.kind == "positional":
            base = _wire_type(p.type) if p.type is not None else str
            if p.required and p.default is None:
                ann = base
                default = inspect.Parameter.empty
            else:
                ann = Optional[base]
                default = _wire_default(p.default)
        else:  # flag
            base = _wire_type(p.type) if p.type is not None else str
            ann = Optional[base]
            default = _wire_default(p.default)
        sig_params.append(inspect.Parameter(
            p.name,
            inspect.Parameter.KEYWORD_ONLY,
            default=default,
            annotation=ann,
        ))
        annotations[p.name] = ann
    annotations["return"] = str
    return inspect.Signature(sig_params, return_annotation=str), annotations

# Predefined verb-exposure profiles. ``None`` means "no filter, expose every
# verb" (current default behavior). The named restricted profiles are the
# allowlists for OAuth-gated remote transports — keeping the public surface
# narrow even when ``--auth-disabled`` is not in effect.
EXPOSE_PROFILES: dict[str, frozenset[str] | None] = {
    "all": None,
    "read-only": frozenset({
        "agents", "context", "help", "impact", "list", "list-verbs",
        "profile", "query", "ramp", "search", "show", "skills", "stats",
        "validate", "where",
    }),
    "remote-rw-narrow": frozenset({
        "context", "help", "intents", "list", "list-verbs", "queue-intent",
        "search", "show", "validate", "where",
    }),
}
# Server-level "expose the union" profile, suitable for multi-principal
# deployments where individual principals carry tighter granted-profiles
# than the server itself. Per-principal gating in `_authorize_verb`
# narrows from this set; the server-level allowlist remains the upper
# bound (no principal can ever invoke a verb the server didn't expose).
EXPOSE_PROFILES["remote-rw-broad"] = (
    EXPOSE_PROFILES["read-only"] | EXPOSE_PROFILES["remote-rw-narrow"]
)


SPEC = VerbSpec(
    name="mcp",
    description="Run an MCP server exposing corpus verbs as tools.",
    example="pyfars mcp --root . --transport http --port 8001 --expose remote-rw-narrow",
    notes=("Requires the packaged MCP dependency. Two transports: `stdio` (default, "
           "subprocess-style) and `http` (Streamable HTTP at /mcp on "
           "--host:--port). Legacy `sse` transport also available. "
           "Profile names: " + ", ".join(sorted(EXPOSE_PROFILES))
           + ". --expose also accepts a comma-list of verb names."),
    output="Long-running server; logs tool counts and transport to stderr on startup.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r",
                  description="default corpus root passed to verbs (default: CWD)"),
        Parameter(name="name", kind="flag", default="corpus",
                  description="MCP server name advertised to clients"),
        Parameter(name="transport", kind="flag", default="stdio",
                  description="transport: stdio | http | sse (default: stdio)"),
        Parameter(name="host", kind="flag", default="127.0.0.1",
                  description="bind host for http/sse transports (default: 127.0.0.1)"),
        Parameter(name="port", kind="flag", type=int, default=8001,
                  description="bind port for http/sse transports (default: 8001)"),
        Parameter(name="expose", kind="flag", default="all",
                  description=("verb exposure: profile name (all | read-only | "
                               "remote-rw-narrow) or comma-list of verbs "
                               "(default: all)")),
        Parameter(name="expose_skills", kind="flag", default=None,
                  description=("expose engineering skills as MCP tools: "
                               "true | false (default: true for 'all' profile, "
                               "false for restricted profiles)")),
        Parameter(name="auth_issuer", kind="flag", default=None,
                  description=("OIDC issuer URL — enables Bearer-token auth "
                               "via discovery (e.g. https://accounts.google.com)")),
        Parameter(name="auth_audience", kind="flag", default=None,
                  description="OIDC audience (the OAuth client ID for this server)"),
        Parameter(name="auth_resource_url", kind="flag", default=None,
                  description=("public URL of this MCP endpoint (the OAuth "
                               "resource identifier, e.g. https://561.group/mcp); "
                               "advertised in the protected-resource metadata")),
        Parameter(name="auth_principals_dir", kind="flag", default=None,
                  description=("directory holding kind:external-principal "
                               "entities (default: operations/command/group/external-principals)")),
        Parameter(name="auth_allow_unmapped", kind="store_true",
                  description=("allow validated tokens whose subject has no "
                               "matching external-principal entity — for early "
                               "dev only")),
        Parameter(name="auth_disabled", kind="store_true",
                  description=("explicit escape hatch: run http transport with "
                               "no authentication (refused for non-loopback hosts)")),
        Parameter(name="auth_as_url", kind="flag", default=None,
                  description=("federated-AS mode: public origin of this "
                               "Authorization Server (e.g. https://561.group). "
                               "Enables /authorize, /token, /register served "
                               "by pyfars; identity is federated to Google. "
                               "Implies --auth-resource-url is also set.")),
        Parameter(name="auth_google_client_id", kind="flag", default=None,
                  description=("Google OAuth client_id used for upstream "
                               "federation (env: PYFARS_GOOGLE_CLIENT_ID). "
                               "Required when --auth-as-url is set.")),
        Parameter(name="auth_google_client_secret", kind="flag", default=None,
                  description=("Google OAuth client_secret (env: "
                               "PYFARS_GOOGLE_CLIENT_SECRET). Prefer the env "
                               "var to avoid leaking via process listings.")),
        Parameter(name="auth_google_callback_url", kind="flag", default=None,
                  description=("public URL of the federated callback "
                               "(default: <auth-as-url>/oauth/google/callback). "
                               "Must match a redirect URI registered with "
                               "the Google client.")),
        Parameter(name="allowed_host", kind="append", default=[],
                  description=("allowed Host-header value for the http "
                               "transport (repeatable). When set, enables "
                               "DNS-rebinding protection. Add the public "
                               "domain a reverse proxy forwards as Host "
                               "(e.g. --allowed-host 561.group).")),
        Parameter(name="allowed_origin", kind="append", default=[],
                  description=("allowed Origin-header value (repeatable, "
                               "for browser-based MCP clients).")),
    ),
)


def _resolve_expose(expose: str | None) -> frozenset[str] | None:
    """Resolve the --expose value to an allowlist (or None for all-verbs).

    Recognized profile names short-circuit; anything else is treated as a
    comma-separated list of verb names. Empty/None defaults to ``all``.
    """
    if not expose or expose == "all":
        return EXPOSE_PROFILES["all"]
    if expose in EXPOSE_PROFILES:
        return EXPOSE_PROFILES[expose]
    return frozenset(s.strip() for s in expose.split(",") if s.strip())


def _resolve_expose_skills(flag: str | None, expose: str | None) -> bool:
    """Default-on for 'all', default-off for restricted profiles; explicit flag wins."""
    if flag is not None and str(flag).lower() in ("true", "false"):
        return str(flag).lower() == "true"
    return (not expose) or expose == "all"


def _verb_modules() -> dict[str, str]:
    from pyfars.cli.__main__ import VERB_MODULES
    return VERB_MODULES


def _spec_for(verb: str) -> VerbSpec | None:
    """Return the verb's ``SPEC`` if it has migrated, else None.

    Raises whatever ``importlib`` raises if the verb module can't be loaded —
    callers (e.g. :func:`main`) decide whether to treat that as fatal or to
    skip the verb and continue.
    """
    suffix = _verb_modules()[verb]
    module = importlib.import_module(f"pyfars.cli.{suffix}")
    return getattr(module, "SPEC", None)


def _verb_main(verb: str) -> Callable[[list[str] | None], int]:
    suffix = _verb_modules()[verb]
    module = importlib.import_module(f"pyfars.cli.{suffix}")
    return module.main


def _inject_auth_subject(verb: str, argv: list[str]) -> list[str]:
    """Override ``--from`` and ``--principal`` for queue-intent with the
    validated MCP request subject, if any.

    Other verbs are untouched. The override is unconditional when an
    authenticated principal is present — clients cannot spoof identity by
    passing their own ``--from``.
    """
    if verb != "queue-intent":
        return argv
    try:
        from pyfars.cli._mcp_auth import current_principal
    except ImportError:
        return argv
    principal = current_principal()
    if principal is None:
        return argv
    qualified = f"{principal.issuer}|{principal.subject}"
    argv = [a for a in argv]
    while "--from" in argv:
        i = argv.index("--from")
        del argv[i:i + 2]
    argv.extend(["--from", qualified])
    if principal.principal_slug:
        while "--principal" in argv:
            i = argv.index("--principal")
            del argv[i:i + 2]
        argv.extend(["--principal", principal.principal_slug])
    return argv


def _authorize_verb(verb: str) -> str | None:
    """Return None if the current principal may invoke ``verb``, else an
    error message string. No-op outside an authenticated MCP request
    (stdio transport, --auth-disabled, or a CLI invocation).

    Per-principal gating reads ``current_principal().granted_profiles``
    and admits the verb if any granted profile contains it. The "all"
    profile (None set) is unconditional. Empty granted_profiles means
    "no per-principal narrowing" — the server-level --expose stays the
    only gate; this preserves dev / single-principal behavior. To deny
    a principal entirely, leave them off the substrate or remove their
    granted-profiles entry server-side.
    """
    try:
        from pyfars.cli._mcp_auth import current_principal
    except ImportError:
        return None
    principal = current_principal()
    if principal is None:
        return None
    profiles = list(principal.granted_profiles or [])
    if not profiles:
        return None
    for name in profiles:
        allow = EXPOSE_PROFILES.get(name)
        if allow is None and name in EXPOSE_PROFILES:
            return None  # "all" → unrestricted
        if allow is not None and verb in allow:
            return None
    return (f"forbidden: verb {verb!r} is not in any of your granted "
            f"profiles ({', '.join(profiles)})")


def _run_argv(verb: str, argv: list[str], default_root: Path) -> str:
    denied = _authorize_verb(verb)
    if denied is not None:
        return denied
    fn = _verb_main(verb)
    if "--root" not in argv and "-r" not in argv and verb not in (
        "help", "install-hooks",
    ):
        argv = ["--root", str(default_root), *argv]
    argv = _inject_auth_subject(verb, argv)
    buf = io.StringIO()
    try:
        with redirect_stdout(buf):
            fn(argv)
    except SystemExit:
        pass
    return buf.getvalue() or "(no stdout output — check stderr in server logs)"


def _run_typed(verb: str, params: dict, default_root: Path) -> str:
    """Invoke a spec-driven verb with typed kwargs, capture stdout.

    Reconstructs argv from the typed dict using the verb's spec, then
    routes through ``main()`` — the renderer logic stays in ``main()``,
    so MCP output matches CLI output byte-for-byte.
    """
    spec = _spec_for(verb)
    if spec is None:
        return _run_argv(verb, [], default_root)

    params = kwargs_from_dict(spec, params)
    if "root" in params and params["root"] in (None, ""):
        params["root"] = str(default_root)

    argv: list[str] = []
    for p in spec.parameters:
        v = params.get(p.name)
        if v is None or v == "":
            continue
        if p.kind == "positional":
            argv.append(str(v))
        elif p.kind == "store_true":
            if v:
                argv.append(f"--{p.name.rstrip('_').replace('_', '-')}")
        elif p.kind == "flag":
            argv.append(f"--{p.name.rstrip('_').replace('_', '-')}")
            argv.append(str(v))
        elif p.kind == "append":
            for item in (v if isinstance(v, list) else [v]):
                argv.append(f"--{p.name.rstrip('_').replace('_', '-')}")
                argv.append(str(item))
    return _run_argv(verb, argv, default_root)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)

    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        print("pyfars mcp: the `mcp` package is not installed.", file=sys.stderr)
        print("  enter the Nix devshell or rebuild the PyFARS package", file=sys.stderr)
        return 2

    root = as_directory(args.root, "pyfars mcp")
    if root is None:
        return 2

    transport_alias = (args.transport or "stdio").lower()
    transport_map = {
        "stdio": "stdio",
        "http": "streamable-http",
        "streamable-http": "streamable-http",
        "sse": "sse",
    }
    if transport_alias not in transport_map:
        print(f"pyfars mcp: unknown --transport {args.transport!r}; "
              f"expected one of: stdio, http, sse", file=sys.stderr)
        return 2
    transport = transport_map[transport_alias]

    is_loopback = args.host in ("127.0.0.1", "localhost", "::1")
    as_mode = bool(args.auth_as_url) and not args.auth_disabled
    rs_mode = bool(args.auth_issuer) and not as_mode and not args.auth_disabled
    auth_enabled = as_mode or rs_mode

    if transport != "stdio" and not is_loopback and not auth_enabled:
        if not args.auth_disabled:
            print(f"pyfars mcp: refusing to bind {transport} on {args.host!r} "
                  f"without --auth-as-url or --auth-issuer. Pass --auth-disabled "
                  f"to override (local dev only) or configure OAuth.",
                  file=sys.stderr)
            return 2
        print(f"pyfars mcp: WARNING — binding {transport} transport on {args.host} "
              f"with --auth-disabled. The corpus is exposed with no authentication.",
              file=sys.stderr)

    token_verifier = None
    auth_server_provider = None
    auth_settings = None
    google_callback_path: str | None = None
    if auth_enabled:
        try:
            from mcp.server.auth.settings import (
                AuthSettings,
                ClientRegistrationOptions,
                RevocationOptions,
            )
        except ImportError as exc:
            print(f"pyfars mcp: cannot import AuthSettings: {exc}", file=sys.stderr)
            return 2
        if not args.auth_resource_url:
            print("pyfars mcp: --auth-resource-url is required when auth is enabled",
                  file=sys.stderr)
            return 2
        principals_subdir = (args.auth_principals_dir
                             or "operations/command/group/external-principals")

    if as_mode:
        import os
        from urllib.parse import urlparse
        from pyfars.cli._mcp_oauth_as import (
            GoogleFederation,
            PolityOAuthProvider,
        )
        google_client_id = (args.auth_google_client_id
                            or os.environ.get("PYFARS_GOOGLE_CLIENT_ID"))
        google_client_secret = (args.auth_google_client_secret
                                or os.environ.get("PYFARS_GOOGLE_CLIENT_SECRET"))
        if not google_client_id or not google_client_secret:
            print("pyfars mcp: --auth-as-url requires --auth-google-client-id "
                  "and --auth-google-client-secret (or PYFARS_GOOGLE_CLIENT_ID "
                  "/ PYFARS_GOOGLE_CLIENT_SECRET env vars)",
                  file=sys.stderr)
            return 2
        callback_url = (args.auth_google_callback_url
                        or args.auth_as_url.rstrip("/") + "/oauth/google/callback")
        google_callback_path = urlparse(callback_url).path or "/oauth/google/callback"
        try:
            federation = GoogleFederation(
                client_id=google_client_id,
                client_secret=google_client_secret,
                callback_url=callback_url,
            )
        except Exception as exc:
            print(f"pyfars mcp: Google OIDC discovery failed: {exc}", file=sys.stderr)
            return 2
        state_dir = (root / ".fars" / "oauth").resolve()
        auth_server_provider = PolityOAuthProvider(
            federation=federation,
            principals_root=root,
            principals_subdir=principals_subdir,
            allow_unmapped=bool(args.auth_allow_unmapped),
            state_dir=state_dir,
        )
        auth_settings = AuthSettings(
            issuer_url=args.auth_as_url,
            resource_server_url=args.auth_resource_url,
            client_registration_options=ClientRegistrationOptions(
                enabled=True,
                # No scope restriction: clients announce what they need; the
                # SDK validates redirect_uri shape and stores metadata.
            ),
            revocation_options=RevocationOptions(enabled=True),
        )
    elif rs_mode:
        from pyfars.cli._mcp_auth import OIDCTokenVerifier
        if not args.auth_audience:
            print("pyfars mcp: --auth-audience is required when --auth-issuer is set",
                  file=sys.stderr)
            return 2
        try:
            token_verifier = OIDCTokenVerifier(
                issuer=args.auth_issuer,
                audience=args.auth_audience,
                principals_root=root,
                principals_subdir=principals_subdir,
                allow_unmapped=bool(args.auth_allow_unmapped),
            )
        except Exception as exc:
            print(f"pyfars mcp: OIDC discovery failed for {args.auth_issuer!r}: {exc}",
                  file=sys.stderr)
            return 2
        auth_settings = AuthSettings(
            issuer_url=args.auth_issuer,
            resource_server_url=args.auth_resource_url,
        )

    server_kwargs: dict = {"host": args.host, "port": int(args.port)}
    if auth_settings is not None:
        server_kwargs["auth"] = auth_settings
    if auth_server_provider is not None:
        server_kwargs["auth_server_provider"] = auth_server_provider
    elif token_verifier is not None:
        server_kwargs["token_verifier"] = token_verifier

    # DNS-rebinding protection: when --allowed-host is provided (typically
    # for production deployments behind a reverse proxy), the SDK's
    # transport-security middleware will validate every Host header against
    # this allowlist. The MCP SDK's middleware default disables the check
    # for backwards compatibility; we opt in explicitly when an allowlist
    # is configured.
    allowed_hosts = list(args.allowed_host or [])
    allowed_origins = list(args.allowed_origin or [])
    if allowed_hosts or allowed_origins:
        from mcp.server.transport_security import TransportSecuritySettings
        server_kwargs["transport_security"] = TransportSecuritySettings(
            enable_dns_rebinding_protection=True,
            allowed_hosts=allowed_hosts,
            allowed_origins=allowed_origins,
        )

    server = FastMCP(args.name, **server_kwargs)

    # Federated callback for AS mode. Registered as a custom route so the
    # SDK does not require a bearer token for it (callback is hit by the
    # browser mid-OAuth-dance, before any token exists).
    if as_mode and auth_server_provider is not None and google_callback_path:
        from pyfars.cli._mcp_oauth_as import make_google_callback_route
        handler = make_google_callback_route(auth_server_provider)
        server.custom_route(google_callback_path, methods=["GET"])(handler)

    allow = _resolve_expose(args.expose)
    expose_skills = _resolve_expose_skills(args.expose_skills, args.expose)
    if allow is not None:
        unknown = allow - set(_verb_modules())
        if unknown:
            print(f"pyfars mcp: --expose names unknown verb(s): "
                  f"{', '.join(sorted(unknown))}", file=sys.stderr)
            return 2

    typed_count = 0
    untyped_count = 0
    skipped: list[tuple[str, str]] = []
    for verb in sorted(_verb_modules()):
        if allow is not None and verb not in allow:
            continue
        try:
            spec = _spec_for(verb)
        except Exception as exc:
            # A broken sibling verb module must not take down the whole MCP
            # server. Skip it, record the reason, and keep going so the rest
            # of the corpus stays reachable to clients.
            skipped.append((verb, f"{type(exc).__name__}: {exc}"))
            continue
        tool_name = f"corpus_{verb.replace('-', '_')}"

        if spec is not None:
            def _make_typed_tool(v: str, sp: VerbSpec):
                sig, annotations = _typed_tool_signature(sp)
                def tool(**kwargs) -> str:
                    return _run_typed(v, kwargs, root)
                tool.__name__ = f"corpus_{v.replace('-', '_')}"
                tool.__doc__ = (
                    f"{sp.description}\n\n"
                    f"Example: `{sp.example}`\n\n"
                    + ("\n".join(
                        f"  - {p.name}: {p.description}"
                        for p in sp.parameters
                    ))
                )
                tool.__signature__ = sig
                tool.__annotations__ = annotations
                return tool
            server.tool(name=tool_name)(_make_typed_tool(verb, spec))
            typed_count += 1
        else:
            def _make_untyped_tool(v: str):
                def tool(args_str: str = "") -> str:
                    """Run the corpus verb. Pass arguments as a single string;
                    quoting is honored (shlex-style), e.g.
                    `--kind concept --query "free monad" --limit 5`."""
                    argv = _split_args(args_str)
                    return _run_argv(v, argv, root)
                tool.__name__ = f"corpus_{v.replace('-', '_')}"
                tool.__doc__ = f"Run `pyfars {v}`. " + (tool.__doc__ or "")
                return tool
            server.tool(name=tool_name)(_make_untyped_tool(verb))
            untyped_count += 1

    # Register engineering skills as additional MCP tools (skill_<slug>).
    # Each runnable SKILL.md script becomes a tool whose body forwards
    # its single ``args_str`` parameter as space-separated argv.
    skills_count = 0
    try:
        from pyfars.skills.api import list_skills, run_skill
    except ImportError:
        list_skills = None  # type: ignore
    if list_skills is not None and expose_skills:
        for skill in list_skills():
            if not skill.is_runnable():
                continue
            tool_name = f"skill_{skill.slug.replace('-', '_')}"
            doc = (
                f"{skill.description}\n\n"
                f"Skill pack: `{skill.pack or '(no pack)'}`. "
                f"Source: `{skill.skill_md}`.\n"
                f"Invoke as `{skill.script}` with args. Pass arguments as a "
                f"single space-separated string."
            )
            def _make_skill_tool(slug: str, doc: str):
                def tool(args_str: str = "") -> str:
                    argv = _split_args(args_str)
                    res = run_skill(slug, argv, cwd=str(root))
                    out = res.stdout
                    if res.exit_code != 0:
                        out += f"\n[skill exit {res.exit_code}]\n{res.stderr}"
                    return out or "(no output)"
                tool.__name__ = f"skill_{slug.replace('-', '_')}"
                tool.__doc__ = doc
                return tool
            server.tool(name=tool_name)(_make_skill_tool(skill.slug, doc))
            skills_count += 1

    if transport == "stdio":
        bind_info = "stdio"
    elif transport == "streamable-http":
        bind_info = f"http://{args.host}:{args.port}/mcp"
    else:  # sse
        bind_info = f"http://{args.host}:{args.port}/sse"
    profile_label = args.expose if args.expose else "all"
    if as_mode:
        auth_label = (f"as(iss={args.auth_as_url}, idp=google, "
                      f"unmapped={'allow' if args.auth_allow_unmapped else 'deny'})")
    elif rs_mode:
        auth_label = (f"rs(iss={args.auth_issuer}, "
                      f"unmapped={'allow' if args.auth_allow_unmapped else 'deny'})")
    elif args.auth_disabled:
        auth_label = "disabled"
    elif transport == "stdio":
        auth_label = "stdio (no auth required)"
    else:
        auth_label = "loopback only (no auth)"
    print(f"pyfars mcp: {typed_count} typed tools + {untyped_count} untyped tools "
          f"+ {skills_count} skill tools (root={root}, transport={transport_alias} "
          f"@ {bind_info}, expose={profile_label}, auth={auth_label})",
          file=sys.stderr)
    if skipped:
        print(f"pyfars mcp: skipped {len(skipped)} broken verb(s):", file=sys.stderr)
        for v, why in skipped:
            print(f"  - {v}: {why}", file=sys.stderr)
    server.run(transport=transport)
    return 0


if __name__ == "__main__":
    sys.exit(main())
