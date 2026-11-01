---
name: syncing-spec-to-gemini-enterprise
description: DEPRECATED 2026-11-01 — Gemini Enterprise subscription/app is deleted (Jun's confirmation) and the sync automation has been removed; kept as a historical record of the retired sync path. Historically synced the MAGI common spec (this bundle's system/ tree) into a Gemini Enterprise / Vertex AI Search data store so Gemini-side agents could cite it.
type: Workflow
lilith_safe: false
tags: [workflow, gemini-enterprise, discoveryengine, vertex-ai-search, gcs, sync]
---

# Overview

> **DEPRECATED (2026-11-01):** The Gemini Enterprise app/subscription has been
> deleted (Jun's confirmation), the "MAGI GE spec 同期" Devin Automation no
> longer exists in the automations list (previously disabled since the
> 2026-08-27 subscription cancellation), and the `magi-knowledge` data store
> itself was deleted on 2026-11-01 (verified empty: `dataStores: []` — its
> last indexed import had been frozen at 2026-08-26). The `magi-dataset` A2A
> workaround below is equally dead — the path it fed no longer exists. This
> runbook is kept for history; do not run it.

Gemini-side agents cannot read `dogmaai/magi-knowledge`. The sync path is:

```
magi-knowledge (main)
  └─ scripts/okf_export.py --tree system      # one Markdown digest, ~90 KB
      └─ gs://<bucket>/okf/system.txt            # stable object name (.txt — see below)
          └─ Discovery Engine data store (unstructured, CONTENT_REQUIRED)
              └─ attached to a Gemini Enterprise app / search engine
```

Only the `system/` tree is ever exported. `_lilith_safe/` MUST NOT be indexed —
Gemini Enterprise is a cross-unit surface, and an indexed LILITH-safe digest
would put other units' processed intelligence one query away from the training
corpus. `okf_export.py` exports exactly one tree per run, so keep the flag at
`--tree system`.

# Environment (verified 2026-08-24 — all resources below deleted 2026-11-01)

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

Discovery Engine derives `content.mime_type` from the **object extension**, and
`text/markdown` is not an accepted type — importing `okf/system.md` fails with
`Field "content.mime_type" must be one of [... text/plain ...], got
"text/markdown"` even when the GCS object's Content-Type is `text/plain`.
Upload the digest as `okf/system.txt`; the content is unchanged Markdown.

`gs://magi-specifications/specifications/*.md` is the **legacy** magi-stg spec
set and is superseded by this bundle — do not refresh it, and prefer a separate
`okf/` prefix so the two are never confused.

# One-time setup (DONE 2026-08-24 — historical record; the store no longer exists)

```bash
export GOOGLE_APPLICATION_CREDENTIALS=<service-account-key>.json
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

# Refresh (dead — the app and its data stores were deleted 2026-11-01)

> **Status (2026-08-27)**: the GeminiEnterprise App subscription has been
> cancelled, so the Devin Automation “MAGI GE spec 同期 (magi-knowledge main →
> Gemini Enterprise)” is **disabled**. Keep the manual steps below as a fallback
> only if the app is re-enabled; do not run them automatically while it is
> cancelled.
>
> **Update (2026-11-01):** the app and all data stores were deleted — nothing
> remains to re-enable; the commands below are dead.

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
* A `.md` object name makes the import fail (see Environment); keep `.txt`.
* The stable object name (`okf/system.txt`) plus `FULL` makes the refresh
  idempotent: each run replaces the previous digest rather than accumulating
  dated copies.
* `documents:import` returns a long-running operation — poll
  `GET https://discoveryengine.googleapis.com/v1/<operation.name>` until
  `done: true` and check `errorSamples`.

## Historical status: `magi-dataset` (pre-deletion)

Direct grounding from the Gemini Enterprise app to `magi-dataset` could not be
established, so it was connected through A2A (Agent2Agent). That A2A path died
with the app on 2026-11-01 — the "current setup" described here no longer
exists.

Direct data-store attachment was the canonical pattern — as with
`magi-news`, an unstructured GCS-backed data store would be attached to the
engine's `dataStoreIds`. A2A was a workaround, not the target architecture.
This status does not change the `MAGI-GE-DESIGN-001-v2` §2.3 boundary: the
eight PLM Cloud Run Jobs must not use Gemini Enterprise or this A2A path.

### Known issue (historical)

Recorded for the postmortem — had direct grounding been revisited:

1. Confirm whether `magi-dataset` is a GCS unstructured data store
   (`CONTENT_REQUIRED`) or a BigQuery structured data store. A structured BQ
   data store cannot be attached directly to an agent, which is a common cause
   of this connection failure.
2. Confirm that both the data store and the engine use the `global` location;
   the regional `us` endpoint is rejected.
3. Confirm that `magi-dataset` is attached to the target engine's
   `dataStoreIds`.

# Verification (historical — pre-deletion)

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
