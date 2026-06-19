#!/usr/bin/env python3
"""LILITH-safe OKF loader — the ONLY sanctioned entry point for the LILITH
training pipeline to read knowledge from this bundle.

Contamination guarantees (fail-loud, never silent):

  * Reads exclusively from ``_lilith_safe/``. Any attempt to resolve a path
    outside that tree raises ``LilithContaminationError``.
  * Every document it returns is re-validated to carry ``lilith_safe: true``.
    A doc missing the flag (e.g. a file mistakenly dropped into the tree)
    raises rather than being returned.
  * ``concept_id`` lookups are normalised and checked against directory
    traversal (``..``) so a caller cannot escape the safe tree via a crafted
    id.

Intended usage from lilith-training (added as a git submodule at
``vendor/magi-knowledge`` or fetched at build time):

    from lilith_safe_loader import LilithSafeKnowledge

    kb = LilithSafeKnowledge("vendor/magi-knowledge")
    isabel_schema = kb.get("schemas/isabel-stats-block")
    patterns      = kb.hallucination_patterns()
    forbidden     = kb.cross_unit_names()   # detector list, never prompt text

The loader returns parsed concepts; it is the caller's job to render them into
prompts. The loader deliberately exposes ``cross_unit_names()`` as a flat list
(a detector) and never injects another unit's data into a prompt.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from okf_common import Concept, iter_concept_files, load_concept  # noqa: E402

SAFE_SUBDIR = "_lilith_safe"


def _extract_verbatim_block(text: str, lang: str = "text") -> str:
    """Return the content of the first ```<lang> fenced block, byte-for-byte.

    Lines strictly between the opening and closing fence are rejoined with
    ``\\n``. Unlike the frontmatter ``body`` (which ``parse_frontmatter``
    normalises via ``splitlines()``), this preserves a block's exact bytes —
    including leading/trailing blank lines — so canonical prompt text can be
    reproduced verbatim. Raises ``ValueError`` if no such block exists.
    """
    open_marker = "```" + lang
    lines = text.split("\n")
    start = None
    for i, line in enumerate(lines):
        if line.strip() == open_marker:
            start = i + 1
            break
    if start is None:
        raise ValueError(f"no opening ```{lang} fence in document")
    for j in range(start, len(lines)):
        if lines[j].strip() == "```":
            return "\n".join(lines[start:j])
    raise ValueError("unterminated fenced block")


class LilithContaminationError(RuntimeError):
    """Raised when a read would cross the LILITH-safe boundary."""


class LilithSafeKnowledge:
    def __init__(self, bundle_root: str | Path):
        self.bundle_root = Path(bundle_root).resolve()
        self.safe_root = (self.bundle_root / SAFE_SUBDIR).resolve()
        if not self.safe_root.is_dir():
            raise FileNotFoundError(
                f"_lilith_safe/ not found under {self.bundle_root}"
            )

    # -- internal guards ----------------------------------------------------
    def _assert_inside_safe(self, path: Path) -> Path:
        resolved = path.resolve()
        if self.safe_root != resolved and self.safe_root not in resolved.parents:
            raise LilithContaminationError(
                f"refusing to read outside _lilith_safe/: {resolved}"
            )
        return resolved

    def _validate(self, concept: Concept) -> Concept:
        if concept.frontmatter.get("lilith_safe") is not True:
            raise LilithContaminationError(
                f"{concept.concept_id}: lilith_safe flag is not true — refusing"
            )
        return concept

    # -- public API ---------------------------------------------------------
    def get(self, concept_id: str) -> Concept:
        """Load a single safe concept by id (e.g. ``schemas/isabel-stats-block``)."""
        cid = concept_id[:-3] if concept_id.endswith(".md") else concept_id
        if ".." in Path(cid).parts:
            raise LilithContaminationError(f"path traversal blocked: {cid!r}")
        rel = cid if cid.startswith(SAFE_SUBDIR) else f"{SAFE_SUBDIR}/{cid}"
        path = self._assert_inside_safe(self.bundle_root / f"{rel}.md")
        if not path.is_file():
            raise FileNotFoundError(f"no safe concept {concept_id!r} ({path})")
        return self._validate(load_concept(self.bundle_root, path))

    def verbatim_block(self, concept_id: str, *, lang: str = "text") -> str:
        """Return a safe concept's first ```<lang> fenced block, byte-for-byte.

        For canonical prompt text (e.g. ``constitution/output-rules``) that the
        caller must reproduce exactly. The frontmatter ``body`` is line-
        normalised and unsafe for that; this reads the raw file after the same
        path + ``lilith_safe`` validation that ``get()`` performs.
        """
        concept = self.get(concept_id)
        raw = concept.path.read_text(encoding="utf-8")
        return _extract_verbatim_block(raw, lang)

    def all_concepts(self) -> list[Concept]:
        out = []
        for path in iter_concept_files(self.safe_root):
            self._assert_inside_safe(path)
            out.append(self._validate(load_concept(self.bundle_root, path)))
        return out

    def by_type(self, type_name: str) -> list[Concept]:
        return [
            c for c in self.all_concepts()
            if c.frontmatter.get("type") == type_name
        ]

    def hallucination_patterns(self) -> list[Concept]:
        return self.by_type("Hallucination Pattern")

    def schemas(self) -> list[Concept]:
        return self.by_type("Prompt Block Schema")

    def cross_unit_names(self) -> list[str]:
        """Return the cross-unit detector list (names only, never data)."""
        for c in self.all_concepts():
            if c.frontmatter.get("cross_unit_detector") is True:
                raw = c.frontmatter.get("unit_names", [])
                return [str(x).lower() for x in raw]
        return []

    def distribution_priors(self) -> dict:
        """Return the ECHIDNA-fitted input priors as a parsed dict.

        Reads the JSON fenced block from the single doc flagged
        ``distribution_priors: true`` (after the same path + ``lilith_safe``
        validation as every other read). These are **aggregates only** — VIX
        regime frequencies, level/cash/ATR quantile bands, and LILITH-own ISABEL
        data-sufficiency weights — used to ground the distill blocks. Raises if
        no such doc exists or the JSON block is missing/malformed (fail-loud).
        """
        for c in self.all_concepts():
            if c.frontmatter.get("distribution_priors") is True:
                raw = c.path.read_text(encoding="utf-8")
                return json.loads(_extract_verbatim_block(raw, "json"))
        raise FileNotFoundError(
            "no doc flagged 'distribution_priors: true' under _lilith_safe/"
        )


if __name__ == "__main__":
    # Smoke check: load the local bundle and print a manifest.
    kb = LilithSafeKnowledge(_SCRIPT_DIR.parent)
    concepts = kb.all_concepts()
    print(f"Loaded {len(concepts)} LILITH-safe concept(s):")
    for c in concepts:
        print(f"  [{c.frontmatter.get('type')}] {c.concept_id}")
    print(f"cross_unit_names detector: {kb.cross_unit_names()}")
