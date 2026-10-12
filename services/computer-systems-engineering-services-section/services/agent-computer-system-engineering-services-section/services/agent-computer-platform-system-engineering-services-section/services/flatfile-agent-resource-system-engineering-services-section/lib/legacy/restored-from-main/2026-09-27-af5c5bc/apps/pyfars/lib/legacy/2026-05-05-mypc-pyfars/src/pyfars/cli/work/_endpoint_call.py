"""OpenAI-compatible HTTPS call to an LLM endpoint, with cost-witness data.

Pure stdlib: urllib.request + json. No new dependencies. Returns a dict with
the response, cost-witness fields, and rate-limit-budget data parsed from
provider response headers.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


class EndpointCallError(Exception):
    pass


def call(*, base_url: str, model: str, api_key: str,
         messages: list[dict], temperature: float = 0.2,
         max_tokens: int | None = None,
         timeout: float = 120.0) -> dict[str, Any]:
    """POST to {base_url}/chat/completions and return parsed result + headers.

    Returned dict shape:
      {
        "ok":   bool,
        "status": int,
        "response": <parsed JSON or None>,
        "headers": {<name>: <value>, ...},   # subset relevant to rate-limit
        "error":  None | str,
      }
    """
    url = base_url.rstrip("/") + "/chat/completions"
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            # Some providers (e.g. Cerebras behind Cloudflare) reject the
            # default urllib UA with a 1010 browser-signature ban. Identify
            # ourselves as the substrate explicitly.
            "User-Agent": "pyfars/0.1 (561-group/predicated-computing)",
        },
        method="POST",
    )

    rate_keys = (
        "x-ratelimit-limit-requests",
        "x-ratelimit-remaining-requests",
        "x-ratelimit-limit-tokens",
        "x-ratelimit-remaining-tokens",
        "x-ratelimit-reset-requests",
        "x-ratelimit-reset-tokens",
        "retry-after",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            headers = {k.lower(): v for k, v in resp.headers.items()
                       if k.lower() in rate_keys}
            try:
                parsed = json.loads(body)
            except json.JSONDecodeError as e:
                return {"ok": False, "status": status, "response": None,
                        "headers": headers, "error": f"JSON decode: {e}"}
            return {"ok": True, "status": status, "response": parsed,
                    "headers": headers, "error": None}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        headers = {k.lower(): v for k, v in e.headers.items()
                   if k.lower() in rate_keys}
        return {"ok": False, "status": e.code, "response": None,
                "headers": headers, "error": body}
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return {"ok": False, "status": 0, "response": None,
                "headers": {}, "error": str(e)}


def _find_secrets_file(start: Path | None = None) -> Path | None:
    """Walk up from `start` (default: CWD) looking for `.secrets` or `.secrets/env`.

    Stops at the first match, or at a directory that looks like a repo root
    (has `.git` or `flake.nix`) without one — beyond the polity's tree we
    don't search.
    """
    cur = (start or Path.cwd()).resolve()
    for parent in [cur] + list(cur.parents):
        single = parent / ".secrets"
        if single.is_file():
            return single
        nested = parent / ".secrets" / "env"
        if nested.is_file():
            return nested
        if (parent / ".git").exists() or (parent / "flake.nix").exists():
            return None
    return None


def _parse_secrets(path: Path) -> dict[str, str]:
    """Parse `KEY=value` lines, ignoring comments and `export ` prefixes."""
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        k = k.strip()
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
            v = v[1:-1]
        out[k] = v
    return out


_SECRETS_TRIED = False


def _load_secrets_into_environ() -> Path | None:
    """Load `.secrets` once per process; existing env vars take precedence."""
    global _SECRETS_TRIED
    if _SECRETS_TRIED:
        return None
    _SECRETS_TRIED = True
    path = _find_secrets_file()
    if path is None:
        return None
    for k, v in _parse_secrets(path).items():
        os.environ.setdefault(k, v)
    return path


def resolve_api_key(env_var: str) -> str:
    """Read the API key from env, loading `.secrets` from the repo root if needed."""
    key = os.environ.get(env_var)
    if key:
        return key
    src = _load_secrets_into_environ()
    key = os.environ.get(env_var)
    if not key:
        hint = (f" (looked in {src})" if src else
                " (no .secrets file found by walking up from CWD)")
        raise EndpointCallError(
            f"environment variable {env_var!r} is not set{hint}; "
            f"cannot authenticate to endpoint")
    return key


def usage_from_response(response: dict | None) -> dict[str, int]:
    """Extract token usage in OpenAI's standard shape."""
    if not response:
        return {}
    usage = response.get("usage") or {}
    return {
        "prompt-tokens": int(usage.get("prompt_tokens", 0)),
        "completion-tokens": int(usage.get("completion_tokens", 0)),
        "total-tokens": int(usage.get("total_tokens", 0)),
    }


def completion_text(response: dict | None) -> str:
    """Extract the assistant's reply from a chat-completions response."""
    if not response:
        return ""
    choices = response.get("choices") or []
    if not choices:
        return ""
    msg = choices[0].get("message") or {}
    return msg.get("content") or ""
