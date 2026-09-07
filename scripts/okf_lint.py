#!/usr/bin/env python3
"""OKF conformance + LILITH-contamination linter for the magi-knowledge bundle.

Two responsibilities:

1. **OKF v0.2 conformance** (SPEC §5, §7, §11): every non-reserved ``.md`` has
   parseable frontmatter with a non-empty ``type``. On top of the spec's
   permissive baseline this bundle *requires* the trust / lifecycle family so
   consumers can tell canonical knowledge from a draft:

     - ``status`` MUST be one of ``draft | stable | deprecated``.
     - ``generated`` MUST be ``{ by: <actor>, at: <ISO 8601 UTC> }``.
     - ``verified`` (optional) MUST be a ``{ by, at }`` mapping or a list of
       them, with §7 actors. ``status: stable`` REQUIRES a ``human:`` verifier
       — AI review alone only earns ``draft``.
     - ``stale_after`` MUST be an ISO 8601 instant; a stale doc is a WARN
       (an ERROR with ``--fail-on-stale``, used by the scheduled CI run).
     - A non-deprecated doc MUST NOT link to a ``status: deprecated`` doc.

2. **LILITH contamination boundary** — the hard requirement for this bundle.
   Anything the LILITH training pipeline is allowed to read lives under
   ``_lilith_safe/`` and is the only thing
   ``scripts/lilith_safe_loader.py`` will load. This linter enforces that the
   boundary cannot be crossed by accident:

     - Every doc under ``_lilith_safe/`` MUST declare ``lilith_safe: true``.
     - Every doc under ``system/``      MUST declare ``lilith_safe: false``.
     - ``lilith_safe: true`` MUST NOT appear anywhere under ``system/``.
     - Inside ``_lilith_safe/`` the following are forbidden (fail-loud):
         * Section 5 / "Jun Review Only" markers and explicit ticker picks
           (entry/stop/target) — these must never reach the model.
         * Names of OTHER MAGI units (cross-unit leakage), UNLESS the file is
           the dedicated cross-unit *detector* doc (``cross_unit_detector:
           true``). Even there, a win-rate / percentage attributed to a named
           unit is still forbidden — the detector lists names only.

Run: ``python scripts/okf_lint.py [--fail-on-stale]`` (exit 0 = clean, 1 = violations).
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from okf_common import (  # noqa: E402
    LIFECYCLE_STATUSES,
    is_actor,
    iter_concept_files,
    lifecycle_status,
    load_concept,
    parse_datetime,
    parse_frontmatter,
    verified_events,
)

BUNDLE_ROOT = _SCRIPT_DIR.parent
LILITH_SAFE_DIR = BUNDLE_ROOT / "_lilith_safe"
SYSTEM_DIR = BUNDLE_ROOT / "system"

# Other MAGI units. Kept in sync with CROSS_UNIT_NAMES in
# lilith-training/scripts/distill_analysis_methods.py — LILITH must never see
# another unit's processed intelligence. LILITH itself is intentionally absent.
CROSS_UNIT_NAMES = (
    "sophia", "melchior", "anima", "casper", "oracle",
    "zeroel", "tiara", "seraph", "balthasar", "prometheus", "typhon",
)
CROSS_UNIT_RE = re.compile(
    r"\b(" + "|".join(CROSS_UNIT_NAMES) + r")\b", re.IGNORECASE
)

# Section 5 = "Jun Review Only" picks. These carry ticker-level entry/stop/
# target calls that must never flow into any PLM, least of all LILITH.
SECTION5_RE = re.compile(
    r"section\s*5|jun[\s_-]*review[\s_-]*only", re.IGNORECASE
)
TICKER_PICK_RE = re.compile(
    r"\b(entry|stop[\s_-]*loss|stop|target|take[\s_-]*profit|tp|sl)\b\s*[:=]\s*"
    r"\$?\d", re.IGNORECASE
)
# A percentage win-rate sitting next to a unit name = leaked unit performance.
UNIT_WINRATE_RE = re.compile(
    r"\b(" + "|".join(CROSS_UNIT_NAMES) + r")\b[^\n]{0,40}?\d{1,3}\s*%",
    re.IGNORECASE,
)


MD_LINK_RE = re.compile(r"\]\(([^)\s#]+)(?:#[^)]*)?\)")


def _rel(path: Path) -> str:
    return path.relative_to(BUNDLE_ROOT).as_posix()


def _resolve_link(src: Path, target: str) -> Path | None:
    """Resolve a bundle-relative (``/x.md``) or relative markdown link."""
    if "://" in target or target.startswith("mailto:"):
        return None
    if target.startswith("/"):
        return (BUNDLE_ROOT / target.lstrip("/")).resolve()
    return (src.parent / target).resolve()


def _check_trust(rel: str, fm: dict, now: datetime, errors: list, warnings: list, stale: list):
    status = fm.get("status")
    if status not in LIFECYCLE_STATUSES:
        errors.append(
            f"{rel}: 'status' must be one of {'/'.join(LIFECYCLE_STATUSES)} "
            f"(got {status!r}; unit lifecycle belongs in 'unit_status')"
        )

    gen = fm.get("generated")
    if not isinstance(gen, dict):
        errors.append(f"{rel}: missing 'generated: {{ by, at }}'")
    else:
        if not is_actor(gen.get("by")):
            errors.append(f"{rel}: generated.by {gen.get('by')!r} is not a §7 actor")
        if parse_datetime(gen.get("at")) is None:
            errors.append(f"{rel}: generated.at {gen.get('at')!r} is not ISO 8601 with UTC offset")

    human_verified = False
    for ev in verified_events(fm):
        if not isinstance(ev, dict):
            errors.append(f"{rel}: verified entry {ev!r} is not a {{ by, at }} mapping")
            continue
        by = ev.get("by")
        if not is_actor(by):
            errors.append(f"{rel}: verified.by {by!r} is not a §7 actor")
        elif by.startswith("human:"):
            human_verified = True
        if parse_datetime(ev.get("at")) is None:
            errors.append(f"{rel}: verified.at {ev.get('at')!r} is not ISO 8601 with UTC offset")
    if status == "stable" and not human_verified:
        errors.append(
            f"{rel}: 'status: stable' requires a 'verified' entry by a human: actor "
            f"(machine/AI review only qualifies for 'draft')"
        )

    if "stale_after" in fm:
        sa = parse_datetime(fm.get("stale_after"))
        if sa is None:
            errors.append(f"{rel}: stale_after {fm.get('stale_after')!r} is not ISO 8601 with UTC offset")
        elif now >= sa and status != "deprecated":
            stale.append(f"{rel}: stale since {fm['stale_after']} — re-verify or deprecate")
    elif status == "stable":
        warnings.append(f"{rel}: stable doc without 'stale_after' (freshness cannot be judged)")


def lint(fail_on_stale: bool = False) -> int:
    errors: list[str] = []
    warnings: list[str] = []
    stale: list[str] = []
    seen = 0
    now = datetime.now(timezone.utc)
    statuses: dict[Path, str] = {}
    links: list[tuple[Path, str, Path]] = []

    for path in iter_concept_files(BUNDLE_ROOT):
        if "scripts" in path.relative_to(BUNDLE_ROOT).parts:
            continue
        seen += 1
        rel = _rel(path)
        try:
            concept = load_concept(BUNDLE_ROOT, path)
        except ValueError as exc:
            errors.append(f"{rel}: frontmatter parse error: {exc}")
            continue

        fm = concept.frontmatter
        # --- OKF §9 conformance -------------------------------------------
        if not fm.get("type"):
            errors.append(f"{rel}: missing required non-empty 'type' field")
        under_safe = LILITH_SAFE_DIR in path.parents
        under_system = SYSTEM_DIR in path.parents
        if under_safe or under_system:
            _check_trust(rel, fm, now, errors, warnings, stale)
        statuses[path.resolve()] = lifecycle_status(fm)
        for m in MD_LINK_RE.finditer(concept.body):
            target = _resolve_link(path, m.group(1))
            if target is not None:
                links.append((path, m.group(1), target))

        lilith_safe = fm.get("lilith_safe")

        # --- boundary: explicit flag must match location ------------------
        if under_safe and lilith_safe is not True:
            errors.append(
                f"{rel}: under _lilith_safe/ but 'lilith_safe' is not true "
                f"(got {lilith_safe!r})"
            )
        if under_system and lilith_safe is not False:
            errors.append(
                f"{rel}: under system/ but 'lilith_safe' is not false "
                f"(got {lilith_safe!r})"
            )
        if under_system and lilith_safe is True:
            errors.append(
                f"{rel}: FORBIDDEN — 'lilith_safe: true' under system/"
            )
        if not under_safe and not under_system and lilith_safe is None:
            warnings.append(f"{rel}: no 'lilith_safe' flag (outside both trees)")

        # --- contamination scan inside _lilith_safe/ ----------------------
        if under_safe:
            body = concept.body
            # A doc may *name* prohibited markers to define the boundary
            # (e.g. the clean-source rule). The data-leak checks below
            # (ticker picks, unit win-rates) still apply unconditionally, so
            # this exemption cannot smuggle an actual pick through.
            defines_prohibitions = fm.get("defines_prohibitions") is True
            if SECTION5_RE.search(body) and not defines_prohibitions:
                errors.append(
                    f"{rel}: CONTAMINATION — Section 5 / Jun-Review marker in "
                    f"a LILITH-safe doc (set 'defines_prohibitions: true' only "
                    f"on a doc whose purpose is to define the prohibition)"
                )
            if TICKER_PICK_RE.search(body):
                errors.append(
                    f"{rel}: CONTAMINATION — explicit ticker entry/stop/target "
                    f"in a LILITH-safe doc"
                )
            if UNIT_WINRATE_RE.search(body):
                errors.append(
                    f"{rel}: CONTAMINATION — win-rate attributed to another "
                    f"MAGI unit in a LILITH-safe doc"
                )
            is_detector = fm.get("cross_unit_detector") is True
            if not is_detector and CROSS_UNIT_RE.search(body):
                m = CROSS_UNIT_RE.search(body)
                errors.append(
                    f"{rel}: CONTAMINATION — cross-unit name {m.group(1)!r} in "
                    f"a LILITH-safe doc (set 'cross_unit_detector: true' only "
                    f"on the dedicated detector doc)"
                )

    # --- deprecated-reference check --------------------------------------
    for src, raw, target in sorted(set(links)):
        if statuses.get(src.resolve()) == "deprecated":
            continue
        if statuses.get(target) == "deprecated":
            errors.append(
                f"{_rel(src)}: links to deprecated concept {raw!r} — point at its "
                f"successor or mark this doc deprecated too"
            )

    # --- reserved index.md frontmatter rule (only bundle-root may have it) -
    for index_path in BUNDLE_ROOT.rglob("index.md"):
        if ".git" in index_path.parts:
            continue
        text = index_path.read_text(encoding="utf-8")
        rel = _rel(index_path)
        is_root = index_path.parent == BUNDLE_ROOT
        if text.startswith("---"):
            if not is_root:
                errors.append(
                    f"{rel}: only the bundle-root index.md may carry frontmatter"
                )
            else:
                try:
                    parse_frontmatter(text)
                except ValueError as exc:
                    errors.append(f"{rel}: bad root index frontmatter: {exc}")

    if fail_on_stale:
        errors.extend(stale)
    else:
        warnings.extend(stale)

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(
        f"\nokf_lint: scanned {seen} concept(s), "
        f"{len(errors)} error(s), {len(warnings)} warning(s), {len(stale)} stale."
    )
    return 1 if errors else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="OKF conformance + LILITH boundary linter")
    ap.add_argument(
        "--fail-on-stale",
        action="store_true",
        help="treat docs past their stale_after as errors (scheduled freshness run)",
    )
    raise SystemExit(lint(fail_on_stale=ap.parse_args().fail_on_stale))
