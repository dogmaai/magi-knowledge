---
type: BigQuery Table
title: distill_bundles (proposed)
description: L1 frozen evaluation bundles — an immutable, input-pinned snapshot of the decision/outcome rows a comparison or method-card distillation was run against, with full manifest, cutoffs and embargo.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-09T23:03:00Z }
stale_after: 2027-04-09T23:03:00Z
tags: [echidna, bigquery, distillation, reproducibility, proposed]
dataset: magi_core
table_type: BASE TABLE (proposed — does not exist yet)
---

> **Draft — proposed table, not yet created.** Written only by the offline
> bundle builder (`buildBundle` lineage) — **never by the live path**.
> The DDL lives in `magi-core` (`sql/`) for Jun to apply.

A view over `distill_decisions`/`distill_outcomes` is **not** a stable
evaluation basis: later corrections and extractor upgrades change what the
same query returns. `distill_bundles` freezes the exact input set — ids,
`record_version`s and content hashes — so a published comparison is
reproducible and a post-freeze correction produces a **new** bundle
instead of silently mutating a concluded evaluation.

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| bundle_id | STRING | Bundle identifier. |
| kind | STRING | `training` / `validation` / `frozen_eval` — split the bundle belongs to. |
| unit_name | STRING | Cohort unit the bundle covers (a bundle is per-cohort). |
| model_version | STRING | Cohort model version. |
| boundary | STRING | Cohort boundary label. |
| content_hash | STRING | SHA-256 over canonical JSON (codepoint-sorted keys — `canonicalJson`/`contentHash` in `lib/method-card.js`) of the semantic bundle content: schema version, cohort dims, input ids/versions/hashes, eval period and stats (mirrors `buildBundle`). |
| manifest_hash | STRING | Same hash function over the **full manifest** — a superset that also covers cutoffs, version fields, `counts_json` and audit metadata. |
| sample_count | INT64 | Number of input decision ids in the manifest. |
| uncertainty | STRING | Stated uncertainty note carried by the bundle. |
| eval_period_from | TIMESTAMP | Evaluation window start. |
| eval_period_to | TIMESTAMP | Evaluation window end (≤60 trading days, frozen at experiment start per the measurement plan). |
| outcome_watermark | TIMESTAMP | Outcomes must be finalized by this instant to count as mature. |
| ingest_cutoff | TIMESTAMP | Only input rows ingested at/before this instant are members — later corrections land in the next bundle. |
| embargo_days | INT64 | Embargo between train/eval splits. |
| input_manifest | STRING | JSON array of `{id, kind, record_version, record_hash}` — the exact input rows. |
| extractor_version | STRING | Extractor version that produced the rows. |
| selector_version | STRING | Card-selection rule version evaluated against this bundle. |
| eval_contract_version | STRING | Version of the evaluation contract (kinds, maturity, allocation). |
| trading_calendar_version | STRING | Trading-day calendar version. |
| code_commit | STRING | magi-core commit of the extractor/selector code. |
| counts_json | STRING | `{adopted, excluded, immature, unevaluable, conflicts}` with reasons. |
| state | STRING | `frozen` / `superseded` / `invalidated` — see mutability contract below. |
| superseded_by | STRING | Replacement `bundle_id` when superseded/invalidated. |
| created_by | STRING | Actor that froze the bundle. |
| created_at | TIMESTAMP | Freeze instant. |

# Contracts

* **Bundles are written frozen.** The builder inserts a row only when an
  evaluation/comparison is frozen for use — `state` starts at `frozen`
  and `created_at` is that instant; there is no mutable "draft bundle"
  state.
* **Only `state`/`superseded_by` may change.** All semantic content —
  manifest, hashes, cutoffs, counts, input pins — is immutable. When a
  post-freeze correction or extractor upgrade changes membership, the
  builder inserts a **new** `bundle_id` and updates exactly these two
  columns on the old row. The transition record is therefore explicit:
  old row's `superseded_by` → new row's manifest + `created_by` /
  `created_at`. Current state stays a single-row read (`bundle_id`
  lookup); history stays auditable via the supersession chain.
* **Input-pinned, not statistic-pinned.** `content_hash` covers the input
  manifest (ids + versions + hashes) and evaluation configuration, so two
  bundles with identical aggregates over different inputs still differ.
* **Membership is verifiable.** Re-checking a bundle re-resolves each
  `input_manifest` `{id, record_version, record_hash}` against the current
  input rows; any hash/version mismatch means a correction landed
  post-freeze → build a new bundle, never update membership in place.
* **Cutoff ordering.** Row selection is `extracted_at ≤ ingest_cutoff →
  max record_version → validate` (both `distill_decisions` and
  `distill_outcomes` persist `extracted_at`); an invalid newest version
  is quarantined, never silently replaced by an older version.
