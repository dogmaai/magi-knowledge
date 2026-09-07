"""Zero-dependency OKF helpers shared by the linter and the loader.

OKF (Open Knowledge Format) v0.2: a bundle is a directory tree of markdown
files, each with a YAML frontmatter block delimited by `---` lines. We avoid a
PyYAML dependency on purpose: the frontmatter we author is intentionally
single-line per key (scalars, inline lists, and inline flow mappings such as
``generated: { by: human:jun, at: 2026-09-07T00:00:00Z }``), so a tiny
purpose-built parser keeps the bundle consumable in any environment (CI,
training containers) with no pip install and no supply-chain surface. Block
(multi-line) YAML mappings are deliberately unsupported.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from datetime import datetime
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


def _split_top_level(inner: str) -> list[str]:
    """Split on commas that are not nested inside ``{}`` / ``[]`` / quotes."""
    parts: list[str] = []
    depth = 0
    quote: Optional[str] = None
    buf: list[str] = []
    for ch in inner:
        if quote:
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
        elif ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
        elif ch == "," and depth == 0:
            parts.append("".join(buf))
            buf = []
            continue
        buf.append(ch)
    if buf or parts:
        parts.append("".join(buf))
    return parts


def _parse_value(raw: str):
    s = raw.strip()
    if s.startswith("[") and s.endswith("]"):
        return _parse_inline_list(s)
    if s.startswith("{") and s.endswith("}"):
        return _parse_inline_mapping(s)
    return _coerce_scalar(s)


def _parse_inline_list(raw: str) -> list:
    inner = raw.strip()[1:-1].strip()
    if not inner:
        return []
    return [_parse_value(part) for part in _split_top_level(inner)]


def _parse_inline_mapping(raw: str) -> dict:
    """Parse a YAML flow mapping such as ``{ by: human:jun, at: 2026-09-07T00:00:00Z }``.

    The key is everything before the first ``:``; the value may itself contain
    colons (actor ids, ISO 8601 timestamps).
    """
    inner = raw.strip()[1:-1].strip()
    out: dict = {}
    if not inner:
        return out
    for part in _split_top_level(inner):
        if ":" not in part:
            raise ValueError(f"malformed flow mapping entry: {part.strip()!r}")
        key, _, value = part.partition(":")
        out[key.strip()] = _parse_value(value)
    return out


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
        fm[key.strip()] = _parse_value(value)
    if body_start is None:
        raise ValueError("missing closing '---' frontmatter delimiter")
    body = "\n".join(lines[body_start:])
    return fm, body


LIFECYCLE_STATUSES = ("draft", "stable", "deprecated")

_ACTOR_RE = re.compile(r"^(human:[A-Za-z0-9_.-]+|process:[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+/[A-Za-z0-9_.:-]+)$")


def is_actor(value) -> bool:
    """OKF §7 actor convention: ``human:<id>``, ``process:<id>`` or ``<producer>/<version>``."""
    return isinstance(value, str) and bool(_ACTOR_RE.match(value))


def parse_datetime(value) -> Optional[datetime]:
    """Parse an OKF timestamp (ISO 8601 with explicit UTC offset, §5)."""
    if not isinstance(value, str):
        return None
    s = value.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    return dt if dt.tzinfo is not None else None


def verified_events(fm: dict) -> list:
    """Normalise ``verified`` (bare mapping or list of mappings) to a list."""
    v = fm.get("verified")
    if v is None:
        return []
    if isinstance(v, dict):
        return [v]
    return list(v) if isinstance(v, list) else [v]


def trust_tier(fm: dict) -> str:
    """OKF §5.3: unverified | machine-confirmed | human-reviewed."""
    events = verified_events(fm)
    if not events:
        return "unverified"
    actors = [e.get("by") for e in events if isinstance(e, dict)]
    if any(isinstance(a, str) and a.startswith("human:") for a in actors):
        return "human-reviewed"
    return "machine-confirmed"


def latest_verified_at(fm: dict) -> Optional[datetime]:
    stamps = [parse_datetime(e.get("at")) for e in verified_events(fm) if isinstance(e, dict)]
    stamps = [s for s in stamps if s is not None]
    return max(stamps) if stamps else None


def lifecycle_status(fm: dict) -> str:
    """OKF §5.4: absent ``status`` means ``stable``."""
    return str(fm.get("status") or "stable")


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
