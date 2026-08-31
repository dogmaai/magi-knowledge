"""Sync one OKF tree into the Cloudflare R2 Data Catalog (Apache Iceberg).

The `magi-system` R2 bucket has R2 Data Catalog enabled, which exposes an
Iceberg REST catalog. This script mirrors the bundle's `system/` tree into a
single Iceberg table (one row per concept document) so R2 SQL / Spark / DuckDB
can query the MAGI spec next to the rest of the warehouse.

The repository stays the source of truth: every run fully replaces the table
contents, so the table is a cache that can be rebuilt at any time.

Requires `pyiceberg[pyarrow]` and a Cloudflare API token with *R2 Data Catalog*
and *R2 Storage* write access (`CLOUDFLARE_R2_CATALOG_TOKEN`).
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pyarrow as pa
from pyiceberg.catalog.rest import RestCatalog
from pyiceberg.exceptions import (
    NamespaceAlreadyExistsError,
    NoSuchNamespaceError,
    NoSuchTableError,
    TableAlreadyExistsError,
)

from okf_common import iter_concept_files, load_concept, parse_frontmatter

BUNDLE_ROOT = Path(__file__).resolve().parent.parent
TREES = {"system": False, "_lilith_safe": True}

DEFAULT_ACCOUNT_ID = "c3b51b9f35d16713caab757feca638d8"
DEFAULT_BUCKET = "magi-system"
DEFAULT_NAMESPACE = "okf"
CATALOG_HOST = "https://catalog.cloudflarestorage.com"

SCHEMA = pa.schema(
    [
        pa.field("concept_id", pa.string(), nullable=False),
        pa.field("tree", pa.string(), nullable=False),
        pa.field("path", pa.string(), nullable=False),
        pa.field("title", pa.string()),
        pa.field("type", pa.string()),
        pa.field("description", pa.string()),
        pa.field("tags", pa.list_(pa.string())),
        pa.field("version", pa.string()),
        pa.field("source", pa.string()),
        pa.field("lilith_safe", pa.bool_(), nullable=False),
        pa.field("frontmatter_json", pa.string(), nullable=False),
        pa.field("body", pa.string(), nullable=False),
        pa.field("source_revision", pa.string(), nullable=False),
        pa.field("okf_version", pa.string(), nullable=False),
        pa.field("synced_at", pa.timestamp("us", tz="UTC"), nullable=False),
    ]
)


def _git_revision() -> str:
    try:
        out = subprocess.run(
            ["git", "-C", str(BUNDLE_ROOT), "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        )
        return out.stdout.strip()
    except (subprocess.CalledProcessError, OSError):
        return "unknown"


def _okf_version() -> str:
    fm, _ = parse_frontmatter((BUNDLE_ROOT / "index.md").read_text(encoding="utf-8"))
    return str(fm.get("okf_version", "unknown"))


def _as_str(value) -> str | None:
    if value is None:
        return None
    return str(value)


def _tags(value) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    if value is None:
        return []
    return [str(value)]


def build_rows(tree: str) -> list[dict]:
    """Read every concept in ``tree`` and return the table rows.

    Aborts when a document's ``lilith_safe`` flag contradicts the tree, which is
    the same contamination guard `okf_export.py` applies.
    """
    root = BUNDLE_ROOT / tree
    if not root.is_dir():
        raise SystemExit(f"tree not found: {root}")
    expected_safe = TREES[tree]
    revision = _git_revision()
    okf_version = _okf_version()
    synced_at = datetime.now(timezone.utc).replace(microsecond=0)

    rows: list[dict] = []
    for path in sorted(iter_concept_files(root)):
        concept = load_concept(BUNDLE_ROOT, path)
        fm = concept.frontmatter
        safe = bool(fm.get("lilith_safe", expected_safe))
        if safe != expected_safe:
            raise SystemExit(
                f"{concept.concept_id}: lilith_safe={safe} contradicts tree {tree!r}"
            )
        rows.append(
            {
                "concept_id": concept.concept_id,
                "tree": tree,
                "path": path.relative_to(BUNDLE_ROOT).as_posix(),
                "title": _as_str(fm.get("title")),
                "type": _as_str(fm.get("type")),
                "description": _as_str(fm.get("description")),
                "tags": _tags(fm.get("tags")),
                "version": _as_str(fm.get("version")),
                "source": _as_str(fm.get("source")),
                "lilith_safe": safe,
                "frontmatter_json": json.dumps(fm, ensure_ascii=False, default=str),
                "body": concept.body,
                "source_revision": revision,
                "okf_version": okf_version,
                "synced_at": synced_at,
            }
        )
    if not rows:
        raise SystemExit(f"no concept documents found under {root}")
    return rows


def _ensure_namespace(catalog: RestCatalog, namespace: str) -> None:
    """Create the namespace only when it does not already exist.

    Avoids the 409 Conflict that ``create_namespace_if_not_exists`` would
    receive from the R2 Data Catalog on every subsequent run, while still
    tolerating a concurrent create.
    """
    try:
        catalog.load_namespace_properties(namespace)
    except NoSuchNamespaceError:
        try:
            catalog.create_namespace(namespace)
        except NamespaceAlreadyExistsError:
            pass


def _get_or_create_table(catalog: RestCatalog, identifier: str, schema: pa.Schema) -> object:
    """Load an existing table or create it, without issuing create calls for
    tables that already exist. A concurrent create is treated as success.
    """
    try:
        return catalog.load_table(identifier)
    except NoSuchTableError:
        try:
            return catalog.create_table(identifier, schema=schema)
        except TableAlreadyExistsError:
            return catalog.load_table(identifier)


def sync(
    tree: str,
    account_id: str,
    bucket: str,
    namespace: str,
    table_name: str,
    token: str,
) -> int:
    data = pa.Table.from_pylist(build_rows(tree), schema=SCHEMA)
    catalog = RestCatalog(
        name="r2-data-catalog",
        warehouse=f"{account_id}_{bucket}",
        uri=f"{CATALOG_HOST}/{account_id}/{bucket}",
        token=token,
    )
    _ensure_namespace(catalog, namespace)
    identifier = f"{namespace}.{table_name}"
    table = _get_or_create_table(catalog, identifier, SCHEMA)
    table.overwrite(data)
    return data.num_rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--tree", choices=sorted(TREES), default="system")
    ap.add_argument("--account-id", default=DEFAULT_ACCOUNT_ID)
    ap.add_argument("--bucket", default=DEFAULT_BUCKET)
    ap.add_argument("--namespace", default=DEFAULT_NAMESPACE)
    ap.add_argument("--table", help="table name (defaults to the tree name)")
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="build the rows and print a summary without touching Cloudflare",
    )
    args = ap.parse_args()

    if args.tree == "_lilith_safe":
        print(
            "refusing to sync _lilith_safe: the R2 Data Catalog is a cross-unit "
            "surface (see .agents/skills/syncing-spec-to-r2-data-catalog)",
            file=sys.stderr,
        )
        return 2

    table_name = args.table or args.tree

    if args.dry_run:
        rows = build_rows(args.tree)
        chars = sum(len(r["body"]) for r in rows)
        print(
            f"{len(rows)} rows, {chars} body chars, would write "
            f"{args.namespace}.{table_name} in {args.account_id}_{args.bucket}",
            file=sys.stderr,
        )
        return 0

    token = os.environ.get("CLOUDFLARE_R2_CATALOG_TOKEN")
    if not token:
        print("CLOUDFLARE_R2_CATALOG_TOKEN is not set", file=sys.stderr)
        return 2

    written = sync(
        args.tree,
        args.account_id,
        args.bucket,
        args.namespace,
        table_name,
        token,
    )
    print(
        f"wrote {written} rows to {args.namespace}.{table_name} "
        f"({args.account_id}_{args.bucket})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
