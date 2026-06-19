"""Zero-dependency OKF helpers shared by the linter and the loader.

OKF (Open Knowledge Format) v0.1: a bundle is a directory tree of markdown
files, each with a YAML frontmatter block delimited by `---` lines. We avoid a
PyYAML dependency on purpose: the frontmatter we author is intentionally flat
(scalars + simple inline lists), so a tiny purpose-built parser keeps the
bundle consumable in any environment (CI, training containers) with no pip
install and no supply-chain surface.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

RESERVED_FILENAMES = {"index.md", "log.md", "README.md"}


@dataclass
class Concept:
    """A parsed OKF concept document."""

    path: Path
    concept_id: str
    frontmatter: dict = field(default_factory=dict)
    body: str = ""


def _coerce_scalar(raw: str):
    """Coerce a frontmatter scalar into bool / int / float / str."""
    s = raw.strip()
    if (s.startswith('"') and s.endswith('"')) or (
        s.startswith("'") and s.endswith("'")
    ):
        return s[1:-1]
    low = s.lower()
    if low in ("true", "false"):
        return low == "true"
    if low in ("null", "~", ""):
        return None
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        pass
    return s


def _parse_inline_list(raw: str) -> list:
    inner = raw.strip()[1:-1].strip()
    if not inner:
        return []
    return [_coerce_scalar(part) for part in inner.split(",")]


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Split an OKF document into (frontmatter dict, body string).

    Raises ValueError when the frontmatter block is missing or malformed so
    callers can fail loud rather than silently treating a doc as empty.
    """
    if not text.startswith("---"):
        raise ValueError("missing opening '---' frontmatter delimiter")
    lines = text.splitlines()
    if lines[0].strip() != "---":
        raise ValueError("first line must be exactly '---'")
    fm: dict = {}
    body_start = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            body_start = i + 1
            break
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            raise ValueError(f"malformed frontmatter line: {line!r}")
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            fm[key] = _parse_inline_list(value)
        else:
            fm[key] = _coerce_scalar(value)
    if body_start is None:
        raise ValueError("missing closing '---' frontmatter delimiter")
    body = "\n".join(lines[body_start:])
    return fm, body


def concept_id_for(bundle_root: Path, path: Path) -> str:
    rel = path.relative_to(bundle_root).as_posix()
    return rel[:-3] if rel.endswith(".md") else rel


def iter_concept_files(root: Path):
    """Yield every non-reserved markdown file under ``root``."""
    for dirpath, _dirnames, filenames in os.walk(root):
        if ".git" in Path(dirpath).parts:
            continue
        for name in sorted(filenames):
            if not name.endswith(".md"):
                continue
            if name in RESERVED_FILENAMES:
                continue
            yield Path(dirpath) / name


def load_concept(bundle_root: Path, path: Path) -> Concept:
    text = path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    return Concept(
        path=path,
        concept_id=concept_id_for(bundle_root, path),
        frontmatter=fm,
        body=body,
    )
