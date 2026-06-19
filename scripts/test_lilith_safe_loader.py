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

    if failures:
        for f in failures:
            print(f"FAIL  {f}")
        print(f"\n{len(failures)} failure(s).")
        return 1
    print(f"OK  loader smoke test passed ({len(concepts)} safe concepts).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
