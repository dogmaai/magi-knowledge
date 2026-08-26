---
name: configuring-cloudflare-ai-search
description: How to configure and operate the Cloudflare AI Search (AutoRAG) instance that indexes the MAGI OKF spec from the magi-system R2 bucket. Use when asked to set up, fix, re-sync, or query the AI Search instance, when search returns 0 results, when path filters or custom metadata need changing, or when the index looks stale.
type: Workflow
lilith_safe: false
tags: [workflow, cloudflare, ai-search, autorag, r2]
---

# Configuring Cloudflare AI Search for the MAGI OKF spec

Docs: <https://developers.cloudflare.com/ai-search/configuration/>

## Current instance

| Item | Value |
| --- | --- |
| Instance ID | `magi-document` (namespace `default`) |
| Account | `c3b51b9f35d16713caab757feca638d8` |
| Source | R2 bucket `magi-system` |
| Path filter | include `okf/system/**` (glob — see below) |
| Embedding model | `@cf/qwen/qwen3-embedding-0.6b` (fixed at creation) |
| Chunking | 1024 tokens, 10% overlap |
| Retrieval | score threshold 0.4, max 10 results, cache off |
| Sync interval | 21600 s (6 h) |
| Custom metadata | `type` text, `lilith_safe` boolean, `version` number, `status` text, `tags` text |
| Last verified | 64 files indexed, 0 errors, 2026-08-26 |

Documents are uploaded by `scripts/ai_search_r2_sync.py` (GitHub Actions
workflow `ai-search-sync.yml` on push to `main`), which sets the custom
metadata via S3 `x-amz-meta-*` headers (`aws s3 cp --metadata`).

## API access

The AutoRAG REST API works with the Global API key (Bearer account tokens are
not needed):

```
H1: X-Auth-Email: jun@dogma.jp
H2: X-Auth-Key: $CLOUDFLARE_GLOBAL_API_KEY
B=https://api.cloudflare.com/client/v4/accounts/<acct>/autorag/rags/magi-document
```

| Action | Request |
| --- | --- |
| Get / list instances | `GET .../autorag/rags` |
| Update instance | `PUT $B` with the changed fields (a partial body is accepted; `PATCH $B` is Route not found) |
| Trigger sync | `PATCH $B/sync` → `{job_id}`; cooldown ≈30 s (`sync_in_cooldown`, code 7020) |
| Index stats | `GET $B/stats` (completed/error counts, `vectorsCount`) |
| Job logs | `GET $B/jobs/<job_id>/logs` |
| Search test | `POST $B/search` with `{"query": "..."}` |

## Path filtering — the 0-results pitfall

`include_items` / `exclude_items` (in `source_params`) use **micromatch
globs**, not prefixes. A bare prefix like `okf/system/` matches nothing →
sync logs say `0 files seen` and search returns empty. Use:

```json
"include_items": ["okf/system/**"]
```

Rules: `*` does not cross `/`, `**` does; exclude wins over include; patterns
match the full path and are case-sensitive; max 10 patterns each. Skipped
files appear in job logs as `Skipped by Include Rules`.

## Custom metadata

- Schema lives in the instance's `custom_metadata` field; max 5 fields; types
  `text` (≤500 chars) / `number` / `boolean` / `datetime`; reserved names
  `timestamp`, `folder`, `filename`. Changing the schema triggers a full
  re-index.
- Built-in attributes always available: `filename`, `folder`, `timestamp`.
- Values come from the R2 objects' `x-amz-meta-*` headers, already written by
  `ai_search_r2_sync.py`.

## Operational notes

- After the GitHub Actions R2 sync, the index refreshes on the 6 h schedule;
  trigger `PATCH $B/sync` for an immediate refresh.
- If no search request arrives for 31 days, scheduled syncs pause
  automatically; the instance stays searchable and resumes on traffic.
- Data source (bucket) and embedding model cannot be changed after creation —
  recreate the instance instead. Everything else (filters, chunking,
  retrieval, models except embedding, metadata) is editable.
- Do not point AI Search at the whole bucket: it will try to index the
  Iceberg internals under `__r2_data_catalog/` and error with
  "unsupported type".
- `_lilith_safe/` must never be included (contamination boundary).

## Verify

```bash
curl -s -H "X-Auth-Email: ..." -H "X-Auth-Key: $KEY" "$B/stats"
# expect: error:0, vectorsCount == completed == number of OKF docs
curl -s -X POST -H ... "$B/search" -d '{"query":"lilith_safe contamination boundary"}'
# expect: hits under okf/system/ with scores ~0.5+
```
