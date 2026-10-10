---
type: BigQuery Table
title: decision_sources (proposed)
description: L0 evidence-lineage ledger for the experience-distillation corpus — one row per information source that entered a decision's context, with the source body held immutably in GCS and only metadata + hashes in BigQuery.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-10T00:54:46Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, lineage, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — created 2026-10-10; draft schema)
---

> **Draft — proposed schema; table created 2026-10-10 in `magi_core`.** No producer is wired. The
> live-path writer (session side) requires a separate, independently
> reviewed change; the DDL lives in `magi-core` (`sql/`) and was applied by Jun on 2026-10-10.
> This document records the GPT-reviewed dataset design behind
> [MODEL CONSOLIDATION](/system/constitution/model-consolidation.md).

`decision_sources` closes preparation requirement 4 of
[model-consolidation](/system/constitution/model-consolidation.md): "what
the unit knew at decision time must be reproducible". One row per source
that entered a decision's context — market snapshots, research rows,
positions/L0 state, tool responses, injected method cards.

Source bodies (prompts, fetched documents, tool payloads) are stored in
GCS, not in BigQuery: BigQuery keeps metadata and hashes so analysts can
scan cheaply, while `body_uri` + `body_sha256` make the exact bytes the
unit saw retrievable and verifiable. A hash alone proves integrity but
cannot restore lost content — that is why the body is preserved, not just
hashed.

# Time semantics (per `source_kind`)

The invariant for external published information is
`published_at ≤ fetched_at ≤ presented_at ≤ decided_at`. Internal state
has no publication time, so `source_kind` defines which timestamps apply:

| source_kind | required timestamps | meaning |
|---|---|---|
| `external` | `published_at`, `fetched_at`, `presented_at` | publicly published data (news, research and market files) |
| `internal_snapshot` | `observed_at`, `presented_at` | MAGI-internal state (positions, L0 flag, reservations) — `observed_at` is the state-read instant, not a publication time |
| `tool_response` | `fetched_at`, `presented_at` | live tool/API output produced for this call |
| `method_card` | `presented_at` | approved card injected into the prompt; `content_version` binds the card hash |

Timestamp sources: `published_at` is the source-reported external
publication time; `observed_at` / `fetched_at` / `presented_at` /
`decided_at` / `ingested_at` are MAGI writer clocks (UTC `TIMESTAMP`).
The contract is ordering, not sub-millisecond clock agreement.

A source fetched or presented **after** `decided_at` is lookahead and must
be excluded by the extractor — never back-filled to look compliant. Rows
whose true times are unknown stay `NULL`; extraction time is never
substituted for decision-time evidence. **A `NULL` `published_at` (or
`fetched_at`) on an `external` row is a lineage failure, not a pass** —
mirroring `checkLineage` in `lib/experience-distillation.js`, which
requires both to be finite and flags `fetched_at > decided_at` as
`future_source`. The row is stored, but the decision is marked
lineage-incomplete and excluded from lookahead-sensitive evaluations.

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| decision_id | STRING | Corpus identifier — issued for **every** decision attempt including `CALL_FAILED`; independent of `thought_id`. |
| thought_id | STRING | Link to `thoughts.thought_id` when a thought row exists; NULL otherwise. |
| unit_name | STRING | Unit that made the decision. |
| session_id | STRING | Session that produced the decision. |
| decided_at | TIMESTAMP | Decision instant. |
| source_seq | INT64 | Order of this source within the assembled context. |
| source_name | STRING | e.g. `moomoo_snapshot`, `market_research`, `positions`, `system_control`. |
| source_kind | STRING | `external` / `internal_snapshot` / `tool_response` / `method_card`. |
| published_at | TIMESTAMP | External publish/event time (external sources). |
| observed_at | TIMESTAMP | State-read instant (internal snapshots). |
| fetched_at | TIMESTAMP | When MAGI fetched/computed the content. |
| presented_at | TIMESTAMP | When the content entered the model context. |
| content_version | STRING | Source-reported version/etag when one exists. |
| body_uri | STRING | Immutable GCS object reference `gs://<bucket>/<path>`; the object generation pins the exact bytes. |
| body_sha256 | STRING | Hex SHA-256 of the stored body's raw bytes (payload hash — never a canonical-JSON digest). |
| media_type | STRING | e.g. `text/plain`, `application/json`. |
| retention_state | STRING | `stored` = body in GCS under the bucket lifecycle; `hash_only` = body deliberately never persisted (hash-only lineage — content unrecoverable by design); `expired` = body deleted by lifecycle/retention policy — hash remains, the row is lineage-complete but evidence-incomplete. |
| parser_version | STRING | Version of the parser that turned raw content into context. |
| transform_version | STRING | Version of any truncation/redaction transform applied. |
| excerpt_offset | INT64 | Byte offset when only a slice was presented. |
| excerpt_len | INT64 | Byte length of the presented slice. |
| record_version | INT64 | Correction chain; latest version wins (≥1). |
| record_hash | STRING | Content hash used for correction dedupe/conflict detection. |
| experiment_id | STRING | Owning experiment (`arc-sig-paper-1`). |
| ingested_at | TIMESTAMP | BigQuery insert time — kept alongside event times for lateness analysis. |

# Contracts

* **Append-only.** Corrections arrive as a higher `record_version` row;
  nothing is UPDATEd/DELETEd. Same id + same version + different
  `record_hash` is a conflict and is quarantined by the extractor —
  **every** row for that key is excluded and reported; resolution takes a
  new higher `record_version` or a human decision, never arrival order.
* **Bodies are immutable.** `body_uri` generation is pinned at write;
  re-fetching a changed upstream document creates a new object.
* **No backdating.** Missing timestamps stay `NULL`; the extractor never
  writes `ingested_at` into `published_at`/`observed_at` to pass lineage.

# Storage and access

Bodies may contain prompts, fetched documents and tool payloads — they
are `system/`-side evidence, **never** `_lilith_safe/` input. BigQuery rows
inherit `magi_core` dataset IAM; GCS object reads are limited to the
extractor/analysis service accounts — no live-trading path needs object
read access.

## Storage decision (Jun, 2026-10-10)

Jun set the minimum retention period to **2 years** and delegated bucket
naming to Devin, suggesting PandoraBoX. The selected bucket name is
**`magi-pandorabox-screen-share-459802`** (project
`screen-share-459802`, location `US`). It replaces the earlier runbook
proposal `magi-distill-context` and holds both `decision_sources.body_uri`
and `distill_decisions.context_uri` payloads. The project suffix reduces
name collisions. **Created 2026-10-10** by Jun — verified via
`describe`: UBLA enabled, public access prevention `enforced`, object
versioning on, unlocked retention `P2Y` (`retentionPeriod: 63115200`).
If this bucket is ever reported missing or collides on a future apply,
stop and update this concept and the runbook before using a replacement;
do not silently write to another bucket.

The required configuration before storing evidence is uniform
bucket-level access, public access prevention **enforced**, object
versioning enabled, and a **2-year bucket retention policy**
(`gcloud storage ... --retention-period=P2Y`). Record the applied retention
period and bucket metadata at provisioning time. The retention clock is
Cloud Storage's per-object retention clock, not the decision or extraction
time. The policy protects objects from deletion/replacement until their
retention expires while the policy remains in force.

**Do not lock the policy.** Retention locking is irreversible and remains
prohibited. An unlocked policy can be shortened or removed by a privileged
operator, so it is not an absolute immutability guarantee; shortening or
removing the approved protection requires a new Jun decision. Versioning
alone does not protect explicit deletion of pinned generations.

The two years are a **minimum retention**, not an automatic deletion
schedule. This decision adds no lifecycle delete rule and does not
schedule cleanup after two years; that would require a separate decision.
Retained versions consume storage, so costs depend on accumulated bytes
and access patterns rather than being assumed negligible.

This records the specific retention/naming decision only. The table
concept remains `draft`, with no whole-document human verification implied;
production provisioning, IAM changes and live-path wiring remain separate
approval/review steps. Jun applies the reviewed `magi-core` runbook only
after this decision is merged and included in the core OKF pin.
