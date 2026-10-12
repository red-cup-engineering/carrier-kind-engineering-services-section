"""``pyfars work heartbeat`` — continuous dispatch loop.

Replaces the bash run.sh + systemd-timer scaffolding with a first-class
pyfars verb. Run as a ``Type=simple`` systemd service; no timer unit needed.

Each iteration:

  1. Drain pending dispatch-intents via ``intake-intent`` (writes tasks to
     ``--task-dir``; already-claimed intents are skipped automatically).
  2. Run one ``work tick`` cycle (pick → dispatch → ingest).
  3. Sleep ``--interval`` seconds (interruptible by SIGTERM/SIGINT).

Idle ticks (no eligible task) are silent. SIGTERM/SIGINT exits cleanly
after the current tick completes. A flock on ``.fars/heartbeat.lock``
refuses to start if another instance is already running.
"""
from __future__ import annotations

import argparse
import fcntl
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.cli.intents import DEFAULT_QUEUE as _DEFAULT_QUEUE
from pyfars.cli.intents import _queue_dir, _walk_intents
from pyfars.cli.work import intake_intent as intake_mod
from pyfars.cli.work import tick as tick_mod

DEFAULT_INTERVAL = 20
DEFAULT_TASK_DIR = "operations/command/projects/intake/tasks"

_shutdown = False


def _handle_signal(signum, frame):  # noqa: ANN001
    global _shutdown
    _shutdown = True


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _log(log_path: Path, msg: str) -> None:
    line = f"{_ts()} heartbeat: {msg}\n"
    try:
        with log_path.open("a", encoding="utf-8") as f:
            f.write(line)
    except OSError:
        pass
    print(line, end="", file=sys.stderr)


def _drain_intents(root: Path, queue: str | None,
                   task_dir: str, log_path: Path) -> None:
    q_dir = _queue_dir(root, queue)
    for path, fm in _walk_intents(q_dir):
        if fm.get("status") != "pending":
            continue
        slug = path.stem
        _log(log_path, f"intake-intent: {slug}")
        argv = [slug, "--root", str(root), "--task-dir", task_dir]
        if queue:
            argv += ["--queue", queue]
        rc = intake_mod.run(argv)
        if rc != 0:
            _log(log_path, f"intake-intent: {slug} rc={rc}")


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work heartbeat")
    ap.add_argument("--root", "-r", default=".",
                    help="corpus root")
    ap.add_argument("--interval", type=int, default=DEFAULT_INTERVAL,
                    help=f"seconds between ticks (default: {DEFAULT_INTERVAL})")
    ap.add_argument("--task-dir", default=DEFAULT_TASK_DIR,
                    help=f"task output dir for promoted intents "
                         f"(default: {DEFAULT_TASK_DIR})")
    ap.add_argument("--queue", default=None,
                    help=f"intent queue under root "
                         f"(default: {_DEFAULT_QUEUE})")
    ap.add_argument("--scope", default=None,
                    help="restrict task search to this subtree")
    ap.add_argument("--prefer", default=None,
                    help="prefer this endpoint slug at dispatch time")
    args = ap.parse_args(argv)

    root = as_directory(args.root, "pyfars work heartbeat")
    if root is None:
        return 2

    fars_dir = root / ".fars"
    fars_dir.mkdir(exist_ok=True)
    log_path = fars_dir / "heartbeat.log"
    lock_path = fars_dir / "heartbeat.lock"

    lock_fd = lock_path.open("w")
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("pyfars work heartbeat: another instance is running",
              file=sys.stderr)
        lock_fd.close()
        return 1

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    _log(log_path, f"start (interval={args.interval}s)")

    while not _shutdown:
        _log(log_path, "tick start")
        _drain_intents(root, args.queue, args.task_dir, log_path)

        tick_argv = ["--root", str(root)]
        if args.scope:
            tick_argv += ["--scope", args.scope]
        if args.prefer:
            tick_argv += ["--prefer", args.prefer]
        rc = tick_mod.run(tick_argv)

        _log(log_path, f"tick end rc={rc}")

        # Interruptible sleep: check _shutdown every second.
        for _ in range(args.interval):
            if _shutdown:
                break
            time.sleep(1)

    _log(log_path, "shutdown")
    lock_fd.close()
    return 0
