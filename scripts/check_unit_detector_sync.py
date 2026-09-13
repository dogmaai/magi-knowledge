#!/usr/bin/env python3
"""Check that the LILITH cross-unit detector list covers the unit registry.

The detector list lives in
``_lilith_safe/hallucination-patterns/cross-unit.md`` (the only doc allowed
to carry other-unit names). The authoritative roster is
``system/plm-units/index.md``. If a unit is added to the registry without
updating the detector, references to the new unit name pass LILITH's
clean-source guard unchecked (R19).

Matching is by lowercased name stem: ``SOPHIA-5`` -> ``sophia``,
``MELCHIOR-1`` -> ``melchior``. Whole-word matching in the detector then
covers suffixed spellings. ``lilith`` itself is excluded — a unit naming
itself is not a cross-unit reference.

Run from the repository root:

    python scripts/check_unit_detector_sync.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from okf_common import parse_frontmatter  # noqa: E402

REGISTRY = REPO_ROOT / "system" / "plm-units" / "index.md"
DETECTOR = (
    REPO_ROOT
    / "_lilith_safe"
    / "hallucination-patterns"
    / "cross-unit.md"
)

SELF_NAME = "lilith"


def registry_stems() -> set[str]:
    """Extract unit names from the plm-units registry tables/links."""
    text = REGISTRY.read_text(encoding="utf-8")
    stems: set[str] = set()
    # Markdown link targets: [SOPHIA-5](sophia-5.md) → "sophia-5"
    for m in re.finditer(r"\[([A-Za-z0-9-]+)\]\(([a-z0-9-]+)\.md\)", text):
        slug = m.group(2).lower()
        stem = re.sub(r"-\d+$", "", slug)  # SOPHIA-5 -> sophia
        stems.add(stem)
    # Folders docs that are not units are filtered by the stem check below.
    stems.discard("index")
    stems.discard(SELF_NAME)
    return stems


def detector_names() -> set[str]:
    fm, _ = parse_frontmatter(DETECTOR.read_text(encoding="utf-8"))
    names = fm.get("unit_names") or []
    return {str(n).strip().lower() for n in names}


def main() -> int:
    stems = registry_stems()
    detected = detector_names()
    missing = sorted(stems - detected)
    extra = sorted(detected - stems - {"seraph", "balthasar"})

    print(f"registry stems : {sorted(stems)}")
    print(f"detector names : {sorted(detected)}")

    ok = True
    if missing:
        ok = False
        print(f"FAIL: registry units missing from detector list: {missing}")
    if extra:
        # Retired/historical names are allowed to outlive the registry —
        # they must stay in the detector so old references still flag.
        print(f"note: detector-only names (retired/aliases, allowed): {extra}")
    if SELF_NAME in detected:
        ok = False
        print("FAIL: detector list contains 'lilith' (self-name must not be listed)")

    if ok:
        print("OK: detector list covers all registry units")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
