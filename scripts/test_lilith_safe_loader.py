#!/usr/bin/env python3
"""Smoke + boundary tests for the LILITH-safe loader.

Pure stdlib (no pytest dependency) so it runs in any CI / training container.
"""
from __future__ import annotations

import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from lilith_safe_loader import (  # noqa: E402
    LilithContaminationError,
    LilithSafeKnowledge,
)

BUNDLE = _SCRIPT_DIR.parent


def main() -> int:
    kb = LilithSafeKnowledge(BUNDLE)
    failures: list[str] = []

    concepts = kb.all_concepts()
    if not concepts:
        failures.append("expected at least one LILITH-safe concept, got 0")

    # Every returned concept must be flagged safe.
    for c in concepts:
        if c.frontmatter.get("lilith_safe") is not True:
            failures.append(f"{c.concept_id}: returned despite lilith_safe!=true")

    # The schemas/isabel-stats-block concept must be reachable.
    try:
        kb.get("schemas/isabel-stats-block")
    except Exception as exc:  # noqa: BLE001
        failures.append(f"could not load isabel-stats-block: {exc}")

    # Boundary: a system/ path must be refused.
    try:
        kb.get("../system/plm-units/sophia-5")
        failures.append("traversal into system/ was NOT blocked")
    except LilithContaminationError:
        pass

    # Boundary: absolute escape attempt must be refused.
    try:
        kb.get("../../etc/passwd")
        failures.append("path traversal was NOT blocked")
    except LilithContaminationError:
        pass

    # The cross-unit detector list must be non-empty.
    if not kb.cross_unit_names():
        failures.append("cross_unit_names() detector list is empty")

    # The verbatim output-rules block must be reproducible byte-for-byte and
    # carry the cross-unit placeholder (filled in by the LILITH-side loader)
    # rather than any literal unit name.
    try:
        block = kb.verbatim_block("constitution/output-rules")
        if "{cross_unit_names}" not in block:
            failures.append("output-rules block missing {cross_unit_names} placeholder")
        if "ABSOLUTE CONSTRAINTS" not in block:
            failures.append("output-rules block missing ABSOLUTE CONSTRAINTS")
        if not (block.startswith("\n") and block.endswith("\n")):
            failures.append("output-rules block lost its leading/trailing newline")
        for name in kb.cross_unit_names():
            if name.lower() in block.lower():
                failures.append(f"output-rules block leaks unit name {name!r}")
    except Exception as exc:  # noqa: BLE001
        failures.append(f"could not read output-rules verbatim block: {exc}")

    # A doc with no fenced block must fail loud, not return garbage.
    try:
        kb.verbatim_block("constitution/clean-source-rule")
        failures.append("verbatim_block did not raise on a doc without a fence")
    except ValueError:
        pass

    if failures:
        for f in failures:
            print(f"FAIL  {f}")
        print(f"\n{len(failures)} failure(s).")
        return 1
    print(f"OK  loader smoke test passed ({len(concepts)} safe concepts).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
