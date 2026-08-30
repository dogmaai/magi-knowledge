"""Sync the MAGI OKF system/ tree to an R2 prefix with AI Search custom metadata.

Each concept document becomes one R2 object under ``s3://<bucket>/<prefix>/``.
Custom metadata is attached as S3-compatible ``x-amz-meta-*`` headers so
Cloudflare AI Search can extract the schema fields defined for the instance.

The repository remains the source of truth; this script is a one-way push of
the current ``system/`` tree into an R2-backed AI Search data source.

Usage:
    python scripts/ai_search_r2_sync.py --bucket magi-system --prefix okf/system --dry-run
    AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
        python scripts/ai_search_r2_sync.py --bucket magi-system --prefix okf/system
    AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
        python scripts/ai_search_r2_sync.py --bucket magi-system --prefix okf/system --prune

The ``--prune`` option reconciles the managed prefix with the current OKF
tree; ``--prune --dry-run`` still requires credentials because it lists the
existing R2 objects before printing deletions.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

# Allow importing okf_common from the same directory.
_SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPT_DIR))

from okf_common import iter_concept_files, load_concept

BUNDLE_ROOT = _SCRIPT_DIR.parent
DEFAULT_ENDPOINT = "https://c3b51b9f35d16713caab757feca638d8.r2.cloudflarestorage.com"

# Cloudflare AI Search custom metadata schema we want to populate.
# Keep this in sync with the dashboard / API configuration for the instance.
CUSTOM_METADATA_SCHEMA = [
    {"field_name": "type", "data_type": "text"},
    {"field_name": "lilith_safe", "data_type": "boolean"},
    {"field_name": "version", "data_type": "number"},
    {"field_name": "status", "data_type": "text"},
    {"field_name": "tags", "data_type": "text"},
]


def _str_value(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (list, tuple)):
        return ",".join(str(v) for v in value) or None
    return str(value)


def build_metadata(frontmatter: dict) -> dict[str, str]:
    """Return the S3 custom metadata key/value pairs for one OKF concept."""
    metadata: dict[str, str] = {}

    if (v := _str_value(frontmatter.get("type"))) is not None:
        metadata["type"] = v

    if (v := frontmatter.get("lilith_safe")) is not None:
        metadata["lilith_safe"] = "true" if v else "false"

    if "version" in frontmatter:
        # Cloudflare number metadata is parsed as float.  Keep strings like
        # "3.0" as a number, but fall back to text if it cannot be coerced.
        try:
            metadata["version"] = str(float(frontmatter["version"]))
        except (ValueError, TypeError):
            metadata["version"] = str(frontmatter["version"])

    if (v := _str_value(frontmatter.get("status"))) is not None:
        metadata["status"] = v

    if (v := _str_value(frontmatter.get("tags"))) is not None:
        metadata["tags"] = v

    return metadata


def upload_file(
    local_path: Path,
    bucket: str,
    key: str,
    endpoint: str,
    metadata: dict[str, str],
    dry_run: bool,
    content_type: str = "text/markdown",
) -> None:
    """Upload ``local_path`` to ``s3://bucket/key`` with the given metadata."""
    s3_uri = f"s3://{bucket}/{key}"

    cmd = [
        "aws",
        "s3",
        "cp",
        str(local_path),
        s3_uri,
        "--endpoint-url",
        endpoint,
        "--content-type",
        content_type,
    ]

    if metadata:
        # aws s3 cp --metadata is a single map argument; pass all fields as one
        # JSON map to avoid later entries overwriting earlier ones.
        cmd.extend(["--metadata", json.dumps(metadata, ensure_ascii=False)])

    if dry_run:
        cmd.append("--dryrun")

    print(" ".join(cmd))

    if not dry_run:
        subprocess.run(cmd, check=True)


def list_managed_keys(bucket: str, prefix: str, endpoint: str) -> set[str]:
    """List every object key under ``prefix`` using S3 pagination."""
    keys: set[str] = set()
    continuation_token: str | None = None

    while True:
        cmd = [
            "aws",
            "s3api",
            "list-objects-v2",
            "--bucket",
            bucket,
            "--prefix",
            f"{prefix}/",
            "--endpoint-url",
            endpoint,
            "--output",
            "json",
        ]
        if continuation_token:
            cmd.extend(["--continuation-token", continuation_token])

        try:
            result = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True,
            )
            response = json.loads(result.stdout)
        except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
            detail = getattr(exc, "stderr", None) or str(exc)
            print(f"Failed to list R2 objects for pruning: {detail}", file=sys.stderr)
            sys.exit(1)

        keys.update(
            item["Key"]
            for item in response.get("Contents", [])
            if isinstance(item.get("Key"), str)
        )
        continuation_token = response.get("NextContinuationToken")
        if not continuation_token:
            return keys


def delete_file(
    bucket: str,
    key: str,
    endpoint: str,
    dry_run: bool,
) -> None:
    """Delete one R2 object, or print the command in dry-run mode."""
    cmd = [
        "aws",
        "s3",
        "rm",
        f"s3://{bucket}/{key}",
        "--endpoint-url",
        endpoint,
    ]
    if dry_run:
        cmd.append("--dryrun")

    print(" ".join(cmd))
    if not dry_run:
        subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sync OKF system/ tree to R2 with AI Search custom metadata headers."
    )
    parser.add_argument("--bucket", required=True, help="Target R2 bucket name.")
    parser.add_argument(
        "--prefix",
        required=True,
        help="Target prefix, e.g. 'okf/system' (no leading or trailing slash).",
    )
    parser.add_argument(
        "--tree",
        default="system",
        help="OKF tree to sync (default: system).  Only 'system' is allowed here.",
    )
    parser.add_argument(
        "--endpoint",
        default=DEFAULT_ENDPOINT,
        help=f"S3-compatible endpoint (default: {DEFAULT_ENDPOINT}).",
    )
    parser.add_argument(
        "--content-type",
        default="text/markdown",
        help="Content-Type to set on uploaded objects (default: text/markdown).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print aws s3 cp commands instead of running them.",
    )
    parser.add_argument(
        "--prune",
        action="store_true",
        help="Delete objects under the managed prefix that no longer correspond to a current OKF concept.",
    )
    parser.add_argument(
        "--schema",
        action="store_true",
        help="Print the custom metadata schema JSON for AI Search and exit.",
    )

    args = parser.parse_args()

    if args.schema:
        print(json.dumps(CUSTOM_METADATA_SCHEMA, indent=2))
        return

    if args.tree != "system":
        print("Only the 'system' tree may be synced to AI Search.", file=sys.stderr)
        sys.exit(1)

    tree_root = BUNDLE_ROOT / args.tree
    prefix = args.prefix.strip("/")
    expected_keys: set[str] = set()

    for concept_path in iter_concept_files(tree_root):
        concept = load_concept(BUNDLE_ROOT, concept_path)
        rel_within_tree = concept_path.relative_to(tree_root).as_posix()
        if rel_within_tree.endswith(".md"):
            rel_within_tree = rel_within_tree[:-3]
        key = f"{prefix}/{rel_within_tree}.md"
        expected_keys.add(key)
        metadata = build_metadata(concept.frontmatter)
        upload_file(
            local_path=concept_path,
            bucket=args.bucket,
            key=key,
            endpoint=args.endpoint,
            metadata=metadata,
            dry_run=args.dry_run,
            content_type=args.content_type,
        )

    if args.prune:
        if not expected_keys:
            print(
                "Refusing to prune: no current OKF concept keys were found.",
                file=sys.stderr,
            )
            sys.exit(1)

        existing_keys = list_managed_keys(args.bucket, prefix, args.endpoint)
        stale_keys = {
            key for key in existing_keys
            if key.endswith(".md") and key not in expected_keys
        }
        for key in sorted(stale_keys):
            delete_file(
                bucket=args.bucket,
                key=key,
                endpoint=args.endpoint,
                dry_run=args.dry_run,
            )
        print(f"Pruned {len(stale_keys)} stale object(s).")

    if args.dry_run:
        print("\nDry run complete; no objects were uploaded.")
    else:
        print("\nSync complete.")
        print(
            "\nNext: configure the AI Search instance source to "
            f"bucket='{args.bucket}' and prefix='{prefix}/', "
            "and add the custom metadata schema from --schema."
        )


if __name__ == "__main__":
    main()
