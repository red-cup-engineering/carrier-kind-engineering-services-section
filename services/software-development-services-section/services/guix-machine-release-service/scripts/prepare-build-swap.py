#!/usr/bin/env python3
"""Activate declared build swap on existing disk through existing sudo permission."""
import json
import os
from pathlib import Path
import stat
import subprocess
import sys


def prepare(config, *, home=None, swaps=None, run=None):
    home = Path.home() if home is None else Path(home)
    swaps = Path("/proc/swaps") if swaps is None else Path(swaps)
    run = subprocess.run if run is None else run
    active = {line.split()[0] for line in swaps.read_text().splitlines()[1:] if line.strip()}
    permitted = home / ".cache/561-group"
    for item in config.get("buildSwapFiles", []):
        path = Path(item["path"])
        size = item["bytes"]
        if path.parent != permitted or path.name not in {"github-guix-build.swap", "github-guix-build-extra.swap"}:
            raise ValueError("build swap must use its dedicated machine cache paths")
        if type(size) is not int or not 1024 * 1024 <= size <= 4 * 1024 ** 3:
            raise ValueError("build swap must declare a bounded allocation")
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() and not path.is_symlink():
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_RDWR, 0o600)
            os.close(fd)
            run(["fallocate", "-l", str(size), str(path)], check=True)
            run(["/usr/sbin/mkswap", str(path)], check=True, stdout=subprocess.DEVNULL)
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_size != size or stat.S_IMODE(info.st_mode) != 0o600:
            raise ValueError("build swap must be a private regular file of the declared size")
        if str(path) not in active:
            # Existing inactive swap is never reinitialized. These are the only
            # privileged operations; no host settings or existing swap are changed.
            run(["sudo", "-n", "chown", "root:root", str(path)], check=True)
            run(["sudo", "-n", "/usr/sbin/swapon", str(path)], check=True)
        print(f"Build swap active: {path} ({size} bytes)")


if __name__ == "__main__":
    prepare(json.loads(Path(sys.argv[1]).read_text()))
