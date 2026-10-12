"""``pyfars work execute <assignment-slug>`` — emit an ExecutionEvent against an assignment.

When the assignment's `to-office` resolves to an `LLMEndpointRecord` (frontmatter
type: llm-endpoint), the verb actually invokes the endpoint via OpenAI-compatible
HTTPS call, then emits the ExecutionEvent with the response folded in. It also
emits a rate-limit-budget Observation per the rate-limit-as-time-windowed-
availability-predication answer, when provider response headers carry the data.

When the target resolves to ``type: unix-tool``, the verb invokes the configured
local command with the task prompt on stdin and records stdout/stderr/exit-code
as the ExecutionEvent. This is the bridge for dispatching final repair work to
local coding agents such as ``codex``.

When `to-office` is *not* an endpoint (i.e., a human or code agent), the verb
records the state-change without invocation — the executor will emit a follow-on
event with the actual outcome.
"""
from __future__ import annotations

import argparse
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Any

from pyfars.cli._runner import as_directory
from pyfars.cli.work._emit import (
    mint_slug, now_iso, write_spoke_event, write_workitem,
)
from pyfars.cli.work._endpoint_call import (
    EndpointCallError, call, completion_text, resolve_api_key, usage_from_response,
)
from pyfars.cli.work._rate_limit_parsers import parse as parse_rate_limit
from pyfars.cli.work._resolve import is_endpoint, is_unix_tool, load, resolve


def _emit_observation_for_rate_limit(endpoint_slug: str, provider: str | None,
                                     headers: dict[str, str],
                                     work_item_slug: str) -> Path:
    """Emit a rate-limit-budget observation per the provider's parser.

    Always writes an observation, even when the provider exposes no
    rate-limit telemetry — `value.exposed: false` lets downstream
    budget-folding distinguish "we have no data" from "we haven't
    asked yet" and the dispatcher's eligibility filter can decide
    whether to assume the budget is healthy or fall back to a counter.
    """
    parsed = parse_rate_limit(provider, headers)
    obs_slug = mint_slug(f"observation-rate-limit-{endpoint_slug}")
    at = now_iso()
    fm = {
        "title": f"Rate-limit budget observation: {endpoint_slug}",
        "type": "workitem",
        "kind": "observation",
        "is-a": "observation",
        "observes": endpoint_slug,
        "observed-at": at,
        "method": "provider-header-extraction",
        "observed-via": "provider-header",
        "provider": provider,
        "value": parsed,
        "scale": "ratio",
    }
    body = (
        f"Rate-limit budget for `{endpoint_slug}` (provider `{provider}`), "
        f"parsed from provider response headers at {at}.\n"
    )
    if not parsed.get("exposed"):
        body += f"\n_No rate-limit telemetry exposed: {parsed.get('note')}_\n"
    target = write_workitem("track", obs_slug, fm, body)

    entity = f"observation:{obs_slug}"
    write_spoke_event("track", work_item_slug, {
        "at": at,
        "kind": "observation-emission",
        "work-item": work_item_slug,
        "entity": entity,
        "increments": [
            {"e": entity, "p": "is-a", "o": "observation", "v": "t"},
            {"e": entity, "p": "observes", "o": endpoint_slug, "v": "t"},
            {"e": entity, "p": "observed-at", "o": at, "v": "t"},
            {"e": entity, "p": "method", "o": "provider-header-extraction", "v": "t"},
            {"e": entity, "p": "value", "o": parsed, "v": "t"},
            {"e": entity, "p": "scale", "o": "ratio", "v": "t"},
        ],
    })
    return target


def _emit_cost_observation(endpoint_slug: str, usage: dict, dollar_cost: float,
                           work_item_slug: str) -> Path:
    """Emit a cost observation in the product-quantale form (tokens × dollars)."""
    obs_slug = mint_slug(f"observation-cost-{endpoint_slug}")
    at = now_iso()
    value = {"tokens": usage, "dollars": dollar_cost}
    fm = {
        "title": f"Settle-cost observation: {endpoint_slug}",
        "type": "workitem",
        "kind": "observation",
        "is-a": "observation",
        "observes": endpoint_slug,
        "observed-at": at,
        "method": "endpoint-response-usage",
        "observed-via": "self-counted",
        "value": value,
        "scale": "ratio",
    }
    target = write_workitem("track", obs_slug, fm,
                            f"Cost-witness for the dispatch settle-action.\n")

    entity = f"observation:{obs_slug}"
    write_spoke_event("track", work_item_slug, {
        "at": at,
        "kind": "observation-emission",
        "work-item": work_item_slug,
        "entity": entity,
        "increments": [
            {"e": entity, "p": "is-a", "o": "observation", "v": "t"},
            {"e": entity, "p": "observes", "o": endpoint_slug, "v": "t"},
            {"e": entity, "p": "observed-at", "o": at, "v": "t"},
            {"e": entity, "p": "method", "o": "endpoint-response-usage", "v": "t"},
            {"e": entity, "p": "value", "o": value, "v": "t"},
            {"e": entity, "p": "scale", "o": "ratio", "v": "t"},
        ],
    })
    return target


def _as_list(v: Any) -> list[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x) for x in v]
    if isinstance(v, str):
        return [v]
    return [str(v)]


def _unix_command(fm: dict) -> list[str]:
    command = fm.get("command")
    args = _as_list(fm.get("args"))
    if isinstance(command, list):
        return [str(x) for x in command] + args
    if isinstance(command, str):
        return shlex.split(command) + args
    return []


def _unix_cwd(root: Path, fm: dict) -> Path:
    cwd = fm.get("working-directory") or fm.get("cwd") or "."
    path = Path(str(cwd))
    if not path.is_absolute():
        path = root / path
    return path.resolve()


def _prompt_for_tool(task_note, prompt_override: str | None,
                     system: str | None) -> str:
    prompt = prompt_override or (task_note.body if task_note else "")
    if system:
        return f"{system.rstrip()}\n\n{prompt}"
    return prompt


def _run_unix_tool(*, root: Path, task_slug: str, assignment_slug: str,
                   office_slug: str, office_fm: dict, task_note,
                   prompt_override: str | None, system: str | None,
                   dry_run: bool) -> int:
    cmd = _unix_command(office_fm)
    if not cmd:
        print("pyfars work execute: unix-tool target is missing command",
              file=sys.stderr)
        return 3

    cwd = _unix_cwd(root, office_fm)
    prompt = _prompt_for_tool(task_note, prompt_override, system)
    timeout = int(office_fm.get("timeout-seconds") or 1800)
    stdin_mode = str(office_fm.get("stdin") or "prompt")
    input_text = prompt if stdin_mode != "none" else None

    if dry_run:
        print("pyfars work execute (dry-run):")
        print(f"  unix-tool: {office_slug}")
        print(f"  command:   {shlex.join(cmd)}")
        print(f"  cwd:       {cwd}")
        print(f"  stdin:     {stdin_mode}")
        print(f"  prompt:    {prompt[:200]}{'...' if len(prompt) > 200 else ''}")
        return 0

    try:
        completed = subprocess.run(
            cmd,
            input=input_text,
            text=True,
            capture_output=True,
            cwd=str(cwd),
            timeout=timeout,
            check=False,
        )
        returncode = completed.returncode
        stdout = completed.stdout or ""
        stderr = completed.stderr or ""
        failure = None
    except FileNotFoundError as e:
        returncode = 127
        stdout = ""
        stderr = str(e)
        failure = "command-not-found"
    except subprocess.TimeoutExpired as e:
        returncode = 124
        stdout = e.stdout if isinstance(e.stdout, str) else ""
        stderr = e.stderr if isinstance(e.stderr, str) else ""
        failure = f"timeout after {timeout}s"

    sc = "completed" if returncode == 0 else "failed"
    ev_slug = mint_slug(f"execution-event-{task_slug}")
    at = now_iso()
    fm = {
        "title": f"ExecutionEvent: {task_slug} {sc} via {office_slug}",
        "type": "workitem",
        "kind": "execution-event",
        "is-a": "execution-event",
        "concerns-task": task_slug,
        "under-assignment": assignment_slug,
        "by-office": office_slug,
        "at": at,
        "state-change": sc,
        "tool-exit-code": returncode,
    }
    if failure:
        fm["failure-diagnosis"] = {
            "error-kind": "unix-tool-failure",
            "message": failure,
        }

    body_lines = [
        f"Execution event for task `{task_slug}` via unix-tool `{office_slug}`.",
        "",
        "## Command",
        "",
        f"```sh\n{shlex.join(cmd)}\n```",
        "",
        "## Prompt",
        "",
        f"```text\n{prompt.rstrip()}\n```",
        "",
        "## Completion",
        "",
        stdout if stdout else "_(no stdout)_",
    ]
    if stderr:
        body_lines += ["", "## Stderr", "", f"```text\n{stderr.rstrip()}\n```"]
    target = write_workitem("execute", ev_slug, fm, "\n".join(body_lines) + "\n")

    entity = f"execution-event:{ev_slug}"
    increments = [
        {"e": entity, "p": "is-a", "o": "execution-event", "v": "t"},
        {"e": entity, "p": "concerns-task", "o": task_slug, "v": "t"},
        {"e": entity, "p": "under-assignment", "o": assignment_slug, "v": "t"},
        {"e": entity, "p": "by-office", "o": office_slug, "v": "t"},
        {"e": entity, "p": "at", "o": at, "v": "t"},
        {"e": entity, "p": "state-change", "o": sc, "v": "t"},
        {"e": entity, "p": "tool-exit-code", "o": returncode, "v": "t"},
    ]
    if failure:
        increments.append(
            {"e": entity, "p": "failure-diagnosis", "o": fm["failure-diagnosis"], "v": "t"}
        )
    write_spoke_event("execute", task_slug, {
        "at": at,
        "kind": "execution-event-emission",
        "work-item": task_slug,
        "entity": entity,
        "increments": increments,
    })
    print(f"pyfars work execute: wrote {target}")
    return 0 if returncode == 0 else 4


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work execute")
    ap.add_argument("assignment", help="assignment slug to execute against")
    ap.add_argument("--root", "-r", default=".", help="corpus root")
    ap.add_argument("--prompt", default=None,
                    help="override the prompt; default: the assignment's task body")
    ap.add_argument("--system", default=None,
                    help="optional system message prepended to the prompt")
    ap.add_argument("--temperature", type=float, default=0.2)
    ap.add_argument("--max-tokens", type=int, default=None)
    ap.add_argument("--state-change", default=None,
                    help="state-change to record (default: completed on success, "
                         "failed on error). For non-endpoint targets, defaults to started.")
    ap.add_argument("--dry-run", action="store_true",
                    help="resolve and report what would happen; do not invoke or emit")
    args = ap.parse_args(argv)

    root = as_directory(args.root, "pyfars work execute")
    if root is None:
        return 2

    sub = load(root)
    a_note = resolve(sub, args.assignment)
    if a_note is None:
        print(f"pyfars work execute: assignment {args.assignment!r} not found",
              file=sys.stderr)
        return 1

    task_slug = a_note.fm.get("assigns-task")
    office_slug = a_note.fm.get("to-office")
    if not task_slug or not office_slug:
        print(f"pyfars work execute: assignment is missing assigns-task or to-office",
              file=sys.stderr)
        return 1

    office_note = resolve(sub, office_slug)
    if office_note is None:
        print(f"pyfars work execute: target {office_slug!r} not found in corpus",
              file=sys.stderr)
        return 1

    task_note = resolve(sub, task_slug)
    if task_note is None and args.prompt is None:
        print(f"pyfars work execute: task {task_slug!r} not found and --prompt not given",
              file=sys.stderr)
        return 1

    if is_unix_tool(office_note):
        return _run_unix_tool(
            root=root,
            task_slug=task_slug,
            assignment_slug=args.assignment,
            office_slug=office_slug,
            office_fm=office_note.fm,
            task_note=task_note,
            prompt_override=args.prompt,
            system=args.system,
            dry_run=args.dry_run,
        )

    # Non-endpoint path — record the state change and exit
    if not is_endpoint(office_note):
        sc = args.state_change or "started"
        ev_slug = mint_slug(f"execution-event-{task_slug}")
        at = now_iso()
        fm = {
            "title": f"ExecutionEvent: {task_slug} {sc}",
            "type": "workitem",
            "kind": "execution-event",
            "is-a": "execution-event",
            "concerns-task": task_slug,
            "under-assignment": args.assignment,
            "by-office": office_slug,
            "at": at,
            "state-change": sc,
        }
        body = f"State-change `{sc}` recorded for non-endpoint office `{office_slug}`.\n"
        target = write_workitem("execute", ev_slug, fm, body)

        entity = f"execution-event:{ev_slug}"
        write_spoke_event("execute", task_slug, {
            "at": at,
            "kind": "execution-event-emission",
            "work-item": task_slug,
            "entity": entity,
            "increments": [
                {"e": entity, "p": "is-a", "o": "execution-event", "v": "t"},
                {"e": entity, "p": "concerns-task", "o": task_slug, "v": "t"},
                {"e": entity, "p": "under-assignment", "o": args.assignment, "v": "t"},
                {"e": entity, "p": "by-office", "o": office_slug, "v": "t"},
                {"e": entity, "p": "at", "o": at, "v": "t"},
                {"e": entity, "p": "state-change", "o": sc, "v": "t"},
            ],
        })
        print(f"pyfars work execute: wrote {target}")
        return 0

    # Endpoint path — invoke the LLM
    prompt = args.prompt or (task_note.body if task_note else "")
    messages: list[dict] = []
    if args.system:
        messages.append({"role": "system", "content": args.system})
    messages.append({"role": "user", "content": prompt})

    fm_ep = office_note.fm
    base_url = fm_ep.get("base-url")
    model = fm_ep.get("model-name")
    auth_env = fm_ep.get("auth-env-var")
    provider = fm_ep.get("provider")
    cost_in = float(fm_ep.get("cost-per-token-in", 0) or 0)
    cost_out = float(fm_ep.get("cost-per-token-out", 0) or 0)

    if args.dry_run:
        print(f"pyfars work execute (dry-run):")
        print(f"  endpoint: {office_slug}")
        print(f"  base-url: {base_url}")
        print(f"  model:    {model}")
        print(f"  auth env: {auth_env}")
        print(f"  prompt:   {prompt[:200]}{'...' if len(prompt) > 200 else ''}")
        return 0

    try:
        api_key = resolve_api_key(auth_env)
    except EndpointCallError as e:
        print(f"pyfars work execute: {e}", file=sys.stderr)
        return 3

    result = call(base_url=base_url, model=model, api_key=api_key,
                  messages=messages, temperature=args.temperature,
                  max_tokens=args.max_tokens)

    usage = usage_from_response(result.get("response"))
    dollars = (usage.get("prompt-tokens", 0) * cost_in
               + usage.get("completion-tokens", 0) * cost_out)
    completion = completion_text(result.get("response"))

    if result["ok"]:
        sc = args.state_change or "completed"
    else:
        sc = args.state_change or "failed"

    ev_slug = mint_slug(f"execution-event-{task_slug}")
    at = now_iso()
    # Per observation-fiber-isolation, usage/cost live on observation
    # entities (emitted below) — not as cells on this execution event.
    fm = {
        "title": f"ExecutionEvent: {task_slug} {sc} via {office_slug}",
        "type": "workitem",
        "kind": "execution-event",
        "is-a": "execution-event",
        "concerns-task": task_slug,
        "under-assignment": args.assignment,
        "by-office": office_slug,
        "at": at,
        "state-change": sc,
        "endpoint-status": result["status"],
    }
    if not result["ok"]:
        fm["failure-diagnosis"] = {
            "error-kind": "endpoint-failure",
            "http-status": result["status"],
            "message": (result.get("error") or "")[:500],
        }
    body_lines = [
        f"Execution event for task `{task_slug}` via endpoint `{office_slug}`.",
        f"",
        f"## Completion",
        f"",
        completion if completion else "_(no completion text returned)_",
    ]
    if not result["ok"]:
        body_lines += [
            "",
            "## Failure",
            "",
            f"Status {result['status']}: {result.get('error', '')[:500]}",
        ]
    target = write_workitem("execute", ev_slug, fm, "\n".join(body_lines) + "\n")

    entity = f"execution-event:{ev_slug}"
    increments = [
        {"e": entity, "p": "is-a", "o": "execution-event", "v": "t"},
        {"e": entity, "p": "concerns-task", "o": task_slug, "v": "t"},
        {"e": entity, "p": "under-assignment", "o": args.assignment, "v": "t"},
        {"e": entity, "p": "by-office", "o": office_slug, "v": "t"},
        {"e": entity, "p": "at", "o": at, "v": "t"},
        {"e": entity, "p": "state-change", "o": sc, "v": "t"},
        {"e": entity, "p": "endpoint-status", "o": result["status"], "v": "t"},
    ]
    if not result["ok"]:
        increments.append(
            {"e": entity, "p": "failure-diagnosis", "o": fm["failure-diagnosis"], "v": "t"}
        )
    write_spoke_event("execute", task_slug, {
        "at": at,
        "kind": "execution-event-emission",
        "work-item": task_slug,
        "entity": entity,
        "increments": increments,
    })
    print(f"pyfars work execute: wrote {target}")

    # Emit cost observation
    cost_target = _emit_cost_observation(office_slug, usage, dollars, task_slug)
    print(f"pyfars work execute: wrote {cost_target}")

    # Emit rate-limit observation; the parser registry decides whether
    # the provider exposed telemetry, but always writes the record so
    # downstream budget-folding sees a consistent observation history.
    rl_target = _emit_observation_for_rate_limit(office_slug, provider,
                                                 result.get("headers", {}),
                                                 task_slug)
    print(f"pyfars work execute: wrote {rl_target}")

    return 0 if result["ok"] else 4
