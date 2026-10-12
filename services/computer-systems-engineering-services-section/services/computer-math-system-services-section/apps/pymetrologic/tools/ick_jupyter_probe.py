"""Probe the ICK-served Jupyter surface for this Python lab.

This is a client-side conformance check. It does not start JupyterLab or any
other sidecar server; it talks to the Information Coherence Kernel that
``make lab`` serves.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from time import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen

JsonObject = dict[str, Any]


@dataclass(frozen=True)
class Step:
    name: str
    method: str
    path: str
    status: int


class ProbeError(RuntimeError):
    """Raised when the ICK Jupyter handshake does not satisfy the lab contract."""


def request_json(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    body: JsonObject | None = None,
) -> tuple[int, Any]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = Request(
        urljoin(base_url.rstrip("/") + "/", path.lstrip("/")),
        data=data,
        method=method,
        headers={
            "accept": "application/json",
            **({} if data is None else {"content-type": "application/json"}),
        },
    )
    try:
        with urlopen(request, timeout=10) as response:
            payload = response.read().decode("utf-8")
            return response.status, json.loads(payload) if payload else None
    except HTTPError as error:
        payload = error.read().decode("utf-8")
        raise ProbeError(f"{method} {path} returned HTTP {error.code}: {payload}") from error
    except URLError as error:
        raise ProbeError(f"{method} {path} failed: {error.reason}") from error


def assert_status(step: Step, expected: int) -> None:
    if step.status != expected:
        raise ProbeError(f"{step.method} {step.path} returned {step.status}; expected {expected}")


def assert_object(value: Any, context: str) -> JsonObject:
    if isinstance(value, dict):
        return value
    raise ProbeError(f"{context} returned {type(value).__name__}; expected JSON object")


def assert_list(value: Any, context: str) -> list[Any]:
    if isinstance(value, list):
        return value
    raise ProbeError(f"{context} returned {type(value).__name__}; expected JSON list")


def probe(base_url: str) -> list[Step]:
    steps: list[Step] = []

    status, api = request_json(base_url, "/api")
    steps.append(Step("api", "GET", "/api", status))
    assert_status(steps[-1], 200)
    api_obj = assert_object(api, "/api")
    if api_obj.get("name") != "Information Coherence Kernel":
        raise ProbeError("/api is not identifying as the Information Coherence Kernel")

    status, kernelspecs = request_json(base_url, "/api/kernelspecs")
    steps.append(Step("kernelspecs", "GET", "/api/kernelspecs", status))
    assert_status(steps[-1], 200)
    kernelspecs_obj = assert_object(kernelspecs, "/api/kernelspecs")
    if kernelspecs_obj.get("default") != "ick":
        raise ProbeError("/api/kernelspecs did not expose the ICK kernel as default")

    status, kernels = request_json(base_url, "/api/kernels")
    steps.append(Step("kernels", "GET", "/api/kernels", status))
    assert_status(steps[-1], 200)
    kernels_list = assert_list(kernels, "/api/kernels")
    if not any(isinstance(kernel, dict) and kernel.get("name") == "ick" for kernel in kernels_list):
        raise ProbeError("/api/kernels did not include a live ICK kernel")

    notebook_path = f"notebooks/ick-probe-{int(time())}.ipynb"
    session_body: JsonObject = {
        "path": notebook_path,
        "name": notebook_path.rsplit("/", 1)[-1],
        "type": "notebook",
        "kernel": {"name": "ick"},
    }
    status, session = request_json(base_url, "/api/sessions", method="POST", body=session_body)
    steps.append(Step("create-session", "POST", "/api/sessions", status))
    assert_status(steps[-1], 201)
    session_obj = assert_object(session, "POST /api/sessions")
    if session_obj.get("path") != notebook_path:
        raise ProbeError("created session did not bind to the requested notebook path")
    kernel = assert_object(session_obj.get("kernel"), "session.kernel")
    if kernel.get("name") != "ick":
        raise ProbeError("created session did not bind to the ICK kernel")

    status, contents = request_json(base_url, "/api/contents")
    steps.append(Step("contents-root", "GET", "/api/contents", status))
    assert_status(steps[-1], 200)
    contents_obj = assert_object(contents, "/api/contents")
    if contents_obj.get("type") != "directory":
        raise ProbeError("/api/contents did not expose the root as a directory")

    encoded_path = quote(notebook_path, safe="/")
    status, notebook = request_json(base_url, f"/api/contents/{encoded_path}")
    steps.append(Step("contents-notebook", "GET", f"/api/contents/{encoded_path}", status))
    assert_status(steps[-1], 200)
    notebook_obj = assert_object(notebook, f"/api/contents/{encoded_path}")
    if notebook_obj.get("type") != "notebook":
        raise ProbeError("session-created notebook was not readable through contents")

    session_id = session_obj.get("id")
    if isinstance(session_id, str) and session_id:
        status, _ = request_json(
            base_url, f"/api/sessions/{quote(session_id, safe='')}", method="DELETE"
        )
        steps.append(Step("delete-session", "DELETE", f"/api/sessions/{session_id}", status))
        assert_status(steps[-1], 204)

    return steps


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:18809",
        help="Base URL for the running ICK service",
    )
    args = parser.parse_args(argv)

    try:
        steps = probe(args.base_url)
    except ProbeError as error:
        print(f"ICK Jupyter probe failed: {error}", file=sys.stderr)
        return 1

    print(f"ICK Jupyter conformance OK at {args.base_url.rstrip('/')}")
    for step in steps:
        print(f"{step.status:>3} {step.method:<6} {step.path} ({step.name})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
