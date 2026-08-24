---
name: syncing-spec-to-gemini-enterprise
description: How to sync the MAGI common spec (this bundle's system/ tree) into a Gemini Enterprise / Vertex AI Search data store so Gemini-side agents can cite it. Use when asked to make the latest MAGI spec available to Gemini Enterprise, when refreshing that data store after a magi-knowledge merge, or when creating the data store for the first time.
type: Workflow
lilith_safe: false
tags: [workflow, gemini-enterprise, discoveryengine, vertex-ai-search, gcs, sync]
---

# Overview

Gemini-side agents cannot read `dogmaai/magi-knowledge`. The sync path is:

```
magi-knowledge (main)
  └─ scripts/okf_export.py --tree system      # one Markdown digest, ~90 KB
      └─ gs://<bucket>/okf/system.txt         # stable object name (.txt — see below)
          └─ Discovery Engine data store (unstructured, CONTENT_REQUIRED)
              └─ attached to a Gemini Enterprise app / search engine
```

Only the `system/` tree is ever exported. `_lilith_safe/` MUST NOT be indexed —
Gemini Enterprise is a cross-unit surface, and an indexed LILITH-safe digest
would put other units' processed intelligence one query away from the training
corpus. `okf_export.py` exports exactly one tree per run, so keep the flag at
`--tree system`.

# Environment (verified 2026-08-24)

| Item | Value |
|---|---|
| GCP project | `screen-share-459802` (number `398890937507`) |
| API | `discoveryengine.googleapis.com`, location **`global`** (the regional `us` endpoint rejects these calls) |
| Collection | `default_collection` |
| This bundle's data store | `magi-knowledge` (created 2026-08-24, `contentConfig: CONTENT_REQUIRED`, attached to the `magi-research` engine) |
| Other GCS-backed data stores | `magi-news`, `magi-earnings`, `magi-sec-filings` (all `contentConfig: CONTENT_REQUIRED`) |
| Existing search apps (engines) | `magi-research`, `magi-system-bqdatastore-li_1779238130897` |

Mirror `magi-news`: unstructured data store, default digital parsing, documents
whose `content.uri` points at a GCS object.

`gs://magi-specifications/specifications/*.md` is the **legacy** magi-stg spec
set and is superseded by this bundle — do not refresh it, and prefer a separate
`okf/` prefix so the two are never confused.

# One-time setup (DONE 2026-08-24 — keep for disaster recovery)

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/gcp-key.json
TOKEN=$(gcloud auth print-access-token)
PROJECT=screen-share-459802
BASE="https://discoveryengine.googleapis.com/v1/projects/$PROJECT/locations/global/collections/default_collection"
```

1. Create the data store (`dataStoreId=magi-knowledge`):

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$BASE/dataStores?dataStoreId=magi-knowledge" -d '{
    "displayName": "MAGI Knowledge (OKF system tree)",
    "industryVertical": "GENERIC",
    "solutionTypes": ["SOLUTION_TYPE_SEARCH"],
    "contentConfig": "CONTENT_REQUIRED"
  }'
```

2. Attach it to the Gemini Enterprise app so agents can cite it — add
   `magi-knowledge` to the target engine's `dataStoreIds` (`PATCH
   $BASE/engines/magi-research`), or pick it in the Gemini Enterprise console
   when the app is managed there. An unattached data store is indexed but
   invisible to agents.

# Refresh (run after every magi-knowledge merge to main)

> **Automated**: the Devin Automation “MAGI GE spec 同期 (magi-knowledge main →
Gemini Enterprise)” runs these steps on every push to `main` that touches
`system/**` or `scripts/okf_export.py`. Run them manually only as a fallback
(e.g. the automation failed, or a GCS/data-store repair is needed).

```bash
cd magi-knowledge && git pull
python scripts/okf_export.py --tree system -o /tmp/system.md
gcloud storage cp --content-type=text/plain /tmp/system.md gs://magi-specifications/okf/system.txt

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$BASE/dataStores/magi-knowledge/branches/default_branch/documents:import" -d '{
    "gcsSource": { "inputUris": ["gs://magi-specifications/okf/system.txt"], "dataSchema": "content" },
    "reconciliationMode": "FULL"
  }'
```

* The object name MUST end in `.txt`: Discovery Engine infers the MIME type
  from the file extension (ignoring the GCS `Content-Type` metadata), and a
  `.md` object imports as `text/markdown`, which the API rejects (`text/plain`
  is allowed). Verified 2026-08-24 — the `.md` import fails even with
  `Content-Type: text/plain` set on the object.

* `dataSchema: "content"` = unstructured import (the file itself is the
  document); `INCREMENTAL` would leave stale documents behind, so use `FULL`.
* The stable object name (`okf/system.txt`) plus `FULL` makes the refresh
  idempotent: each run replaces the previous digest rather than accumulating
  dated copies.
* `documents:import` returns a long-running operation — poll
  `GET https://discoveryengine.googleapis.com/v1/<operation.name>` until
  `done: true` and check `errorSamples`.

# Verification

1. `GET $BASE/dataStores/magi-knowledge/branches/default_branch/documents` —
   the document's `content.uri` is the GCS object and `indexStatus.indexTime` is
   the current run.
2. Ask the Gemini Enterprise app a spec question that can only be answered from
   the bundle (e.g. which unit owns causal analysis — SEKHMET) and confirm the
   answer cites the `magi-knowledge` data store.

# Boundaries

* **Never index `_lilith_safe/`** (see Overview).
* Per `MAGI-GE-DESIGN-001-v2` §2.3 the 8 PLM Cloud Run Jobs must not read
  through Gemini Enterprise; they stay on the Vertex AI / Gemini Developer APIs.
  This data store is for Gemini-side research and agent Q&A only.
* The repository stays the source of truth. The digest is a cache: never edit it
  in GCS — regenerate and re-import.
