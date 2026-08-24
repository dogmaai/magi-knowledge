---
name: syncing-spec-to-r2-data-catalog
description: How to sync the MAGI common spec (this bundle's system/ tree) into the Cloudflare R2 Data Catalog (Apache Iceberg) on the magi-system bucket, so R2 SQL / Spark / DuckDB can query the spec. Use when asked to sync Cloudflare, to refresh the okf.system Iceberg table, or when the R2 Data Catalog token stops working.
type: Workflow
lilith_safe: false
tags: [workflow, cloudflare, r2, iceberg, data-catalog, sync]
---

# Overview

The `magi-system` R2 bucket has R2 Data Catalog enabled, which is an **Apache
Iceberg REST catalog** — not an object/Markdown index. The sync path is:

```
magi-knowledge (main)
  └─ scripts/r2_catalog_sync.py --tree system     # one row per concept doc
      └─ Iceberg table okf.system in warehouse c3b51b9f...d8_magi-system
          └─ R2 SQL Studio / Spark / DuckDB / PyIceberg
```

This is the analytical mirror of the Gemini Enterprise sync (see
`syncing-spec-to-gemini-enterprise`, which ships the same tree as one
unstructured text document). Both are caches; the repository is the source of
truth. Every run **fully replaces** the table (`table.overwrite`), so the
refresh is idempotent and leaves no stale rows.

Only the `system/` tree is ever synced. `_lilith_safe/` MUST NOT be written to
this catalog — R2 SQL is a cross-unit surface. `r2_catalog_sync.py` refuses
`--tree _lilith_safe` outright, and it also aborts if any document's
`lilith_safe` frontmatter contradicts the selected tree.

# Environment (verified 2026-08-24)

| Item | Value |
|---|---|
| Cloudflare account | `c3b51b9f35d16713caab757feca638d8` (Dogma.ai) |
| R2 bucket | `magi-system` |
| Catalog URI | `https://catalog.cloudflarestorage.com/c3b51b9f35d16713caab757feca638d8/magi-system` |
| Warehouse | `c3b51b9f35d16713caab757feca638d8_magi-system` |
| Namespace / table | `okf` / `system` |
| Token secret | `CLOUDFLARE_R2_CATALOG_TOKEN` (org secret: `CLOUDFLARE_R2_CATALOG_TOKEN_V2`) |
| Last verified write | 64 rows @ `082c503`, 2026-08-24 |
| Table maintenance | compaction on (128 MB target), snapshot expiry on (min 3 snapshots, max 7d) — configured in the dashboard, no action needed here |

Table columns: `concept_id`, `tree`, `path`, `title`, `type`, `description`,
`tags` (list), `version`, `source`, `lilith_safe`, `frontmatter_json`, `body`,
`source_revision` (git short SHA), `okf_version`, `synced_at`.

# Credentials

The token must have **both** R2 Data Catalog *and* R2 Storage write permission,
account-wide — PyIceberg calls the catalog with the bearer token and then writes
Parquet data files to the bucket with credentials the catalog vends.

Create it at R2 → **API** → *Manage API tokens* → **Create Account API token** →
permission **Admin Read & Write**, then store the *Token value* as
`CLOUDFLARE_R2_CATALOG_TOKEN`.

Tokens that do **not** work (verified):

* Workers tokens (`CLOUDFLARE_WORKERS_READ_TOKEN`, `..._BUILDS_TOKEN`) — R2 API
  returns `Authentication error`.
* The dashboard-generated **“[R2 Data Catalog] Table Maintenance”** token: it
  can `GET /v1/config` and list namespaces, but every write returns
  `403 Forbidden: Insufficient permission for R2 Data Catalog Warehouse`. It is
  minimum-scope for compaction/snapshot expiry only.
* `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — S3 credentials; they are not
  accepted by the Iceberg REST catalog and were `Unauthorized` on the S3 API.

Note that a working catalog token is not necessarily a valid *user* API token:
`GET /user/tokens/verify` returns `Invalid API Token` for account-scoped R2
tokens, so diagnose with `GET <catalog>/v1/namespaces` instead.

# Refresh

Merges to `main` that touch `system/` are synced automatically by the
`R2 Data Catalog Sync` GitHub Actions workflow
(`.github/workflows/r2-catalog-sync.yml`), which reads the repo secret
`CLOUDFLARE_R2_CATALOG_TOKEN`. Manual refresh (or if the workflow is broken):

```bash
pip install "pyiceberg[pyarrow]"
cd magi-knowledge && git pull
python scripts/r2_catalog_sync.py --dry-run           # row/char count, no network
CLOUDFLARE_R2_CATALOG_TOKEN=<token> python scripts/r2_catalog_sync.py
```

The script creates the namespace and table on first run
(`create_namespace_if_not_exists` / `create_table_if_not_exists`), so there is
no separate bootstrap step. A full run takes ~1–2 minutes (the `overwrite` does
a delete + append against the vended R2 credentials); `UserWarning: Delete
operation did not match any records` on the first run is expected.

# Verification

```bash
CAT=https://catalog.cloudflarestorage.com/c3b51b9f35d16713caab757feca638d8/magi-system
curl -s -H "Authorization: Bearer $CLOUDFLARE_R2_CATALOG_TOKEN" "$CAT/v1/namespaces"
curl -s -H "Authorization: Bearer $CLOUDFLARE_R2_CATALOG_TOKEN" "$CAT/v1/namespaces/okf/tables"
```

Then scan the table and confirm `source_revision` matches the merged commit:

```python
from pyiceberg.catalog.rest import RestCatalog
acc = "c3b51b9f35d16713caab757feca638d8"
cat = RestCatalog(name="r2", warehouse=f"{acc}_magi-system",
                  uri=f"https://catalog.cloudflarestorage.com/{acc}/magi-system",
                  token="<token>")
t = cat.load_table("okf.system").scan().to_arrow()
print(t.num_rows, set(t.column("source_revision").to_pylist()))
```

# Boundaries

* **Never sync `_lilith_safe/`** to this catalog (see Overview).
* The table is a cache: never edit rows in place — regenerate and re-run.
* R2 Data Catalog is for analytical/SQL access to the spec. Runtime PLM units
  keep reading their own sources; do not route the 8 PLM Cloud Run Jobs through
  it (`MAGI-GE-DESIGN-001-v2` §2.3 applies to any cross-unit surface).
