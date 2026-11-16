---
type: BigQuery Table
title: llm_lifecycle_checks
description: Proposed append-only log of the model lifecycle monitor — provider catalog checks, deprecation-announcement mentions and source-page fingerprints per LLM model; doubles as the monitor's notification dedupe state. Design only — table not created.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=llm_lifecycle_checks&page=table
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-09T10:30:00Z }
stale_after: 2027-02-09T10:30:00Z
tags: [echidna, bigquery, monitoring, providers, lifecycle, proposal]
dataset: magi_core
table_type: BASE TABLE
---

> **Draft — proposal, not created.** Written for the lifecycle monitor in
> [magi-model-health-check](/system/services/magi-model-health-check.md)
> (draft). The DDL (`magi-core/sql/create_llm_lifecycle_checks.sql`) is
> applied by Jun; nothing here asserts the table exists.

`llm_lifecycle_checks` records what the lifecycle monitor
(`magi-core/model-lifecycle-monitor.js`, proposed Cloud Run job
`magi-model-lifecycle-monitor`, daily) found about every LLM model MAGI uses.

# Why a new table (not `llm_health_checks` or `llm_config`)

* `llm_config` is the human-maintained registry; the monitor must only
  *propose* changes to it, never write it.
* `llm_health_checks` (live, uncatalogued — see the drift backlog in
  [index](index.md)) is one row per provider ping every 5 minutes during
  market hours. Lifecycle results have a different grain (model × evidence
  source), cadence (daily) and carry their own notification-dedupe state,
  following the [bridge-health-checks](bridge-health-checks.md) pattern
  (the table is read back by the job; no separate state table).

# Row kinds (`check_type`)

| check_type | One row per | Meaning |
|---|---|---|
| `catalog` | target model | Is the configured ID still in the provider's model list? |
| `announcement` | mention found | An official deprecation/changelog page names the model (or its family, e.g. "K2 series") within reach of a retirement keyword. |
| `source` | announcement page | Page fetched; `page_sha256` fingerprints its text, `result=changed` when it differs from the last run. |
| `target_source` | failed source | A target source (Cloud Run listing, OKF fetch, code scan) could not be read. |

# Schema (proposed)

| Column | Type | Description |
|---|---|---|
| run_id | STRING | One UUID per execution. |
| checked_at | TIMESTAMP | Run time; partition key (DATE). |
| check_type | STRING | See above. |
| provider | STRING | Provider key (`lib/config.js` naming). |
| model | STRING | Model ID. |
| units | STRING | Comma-separated units / Cloud Run resources using it. |
| origins | STRING | Where the target came from (`cloudrun:job/<name>#ENV`, `okf@<sha>:<path>`, `code:<path>`, `config:default`). |
| runtime | BOOL | True when a deployed resource or `config.js` uses the model; OKF- or code-only targets are false. |
| result | STRING | `present` / `missing` / `missing_unconfirmed` / `mentioned` / `changed` / `unchanged` / `skipped` / `error`. |
| severity | STRING | `critical` (runtime target missing or announced) / `warning` (non-runtime target announced) / `info` / `ok`. |
| detail | STRING | Announcement snippet or error text (no credentials). |
| evidence_url | STRING | Announcement / source page. |
| evidence_key | STRING | Hash of (provider, model, evidence); notification dedupe key. |
| page_sha256 | STRING | `source` rows: text fingerprint. |
| candidate_deprecated_date | DATE | Date parsed near the mention — unverified candidate. |
| candidate_successor | STRING | Replacement parsed near the mention — unverified candidate. |
| llm_config_status | STRING | `llm_config.status` at check time. |
| proposal_json | STRING | Proposed `llm_config` change (`current` / `proposed` / `registered`); never applied automatically. |
| alerted | BOOL | True only when the notifier accepted the message. |
| okf_ref | STRING | magi-knowledge commit the OKF targets were read from. |
| cloud_run_execution | STRING | Cloud Run execution name. |

# Notification contract (proposed)

* Notify `critical` / `warning` findings that still have an `llm_config`
  proposal (i.e. the registry does not already record the deprecation).
* Same `evidence_key` re-notified at most every
  `MODEL_LIFECYCLE_REALERT_DAYS` (default 7) while the proposal stands.
* `alerted` is written only when the send succeeded, so a failed send is
  retried next run.
* `missing_unconfirmed`, `skipped`, `error` and page changes are recorded,
  not notified.

# Joins

* `(provider, model)` → [llm-config](llm-config.md)
* `units` → [plm-units](/system/plm-units/)
