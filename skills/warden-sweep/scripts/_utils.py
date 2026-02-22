"""Shared utilities for warden-sweep scripts."""
from __future__ import annotations

import json
import os
import subprocess
from typing import Any


def run_cmd(
    args: list[str], timeout: int = 30, cwd: str | None = None
) -> subprocess.CompletedProcess[str]:
    """Run a command and return the result."""
    return subprocess.run(
        args,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=cwd,
    )


def read_jsonl(path: str) -> list[dict[str, Any]]:
    """Read a JSONL file and return list of parsed objects."""
    entries: list[dict[str, Any]] = []
    if not os.path.exists(path):
        return entries
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries
