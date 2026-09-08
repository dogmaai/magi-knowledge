---
type: BigQuery Table
title: sekhmet_reviews
description: SHADOW-only audit ledger for deployed SEKHMET hard-case reviews.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=sekhmet_reviews&page=table
lilith_safe: false
status: stable
generated: { by: "process:github-actions", at: 2026-09-08T09:17:58Z }
verified: { by: "human:jun", at: 2026-09-08T09:17:58Z }
stale_after: 2027-03-07T09:17:58Z
tags: [echidna, bigquery, sekhmet, shadow, audit]
dataset: magi_core
table_type: BASE TABLE
---

# Status and boundary

Jun created and visually verified
`screen-share-459802.magi_core.sekhmet_reviews` in BigQuery location `US`
on 2026-09-08. The deployed producer is scheduled weekly; the first inserted
SHADOW row remains to be verified.

This is cross-unit processed intelligence and is therefore
`lilith_safe: false`. It must never feed LILITH, `_lilith_safe/`, PLM
prompts, orders, guards, or position sizing.

# Proposed schema

| Column | Type | Description |
|---|---|---|
| review_id | STRING, required | UUID for the audit row. |
| reviewed_at | TIMESTAMP, required | Review completion time. |
| thought_id | STRING, required | Reviewed thought identifier. |
| session_id | STRING | Source session. |
| symbol | STRING | Source ticker; audit only. |
| candidate_action | STRING | Historical candidate action. |
| trigger_fingerprint | STRING, required | Deterministic de-duplication key. |
| trigger_reasons | STRING | JSON array of deterministic selection reasons. |
| priority_score | FLOAT64 | Historical review priority, not a trading score. |
| verdict | STRING | `PASS`, `CHALLENGE`, or `ABSTAIN`. |
| finding_type | STRING | Finding category or `NO_ACTIONABLE_FINDING`. |
| hypothesis | STRING | Falsifiable hypothesis. |
| evidence | STRING | JSON evidence array. |
| counterexamples | STRING | JSON counterexample array. |
| applicability | STRING | JSON applicability array. |
| exclusions | STRING | JSON exclusion array. |
| validation_sql | STRING | Optional read-only validation query. |
| acceptance_test | STRING | Falsifiable success condition. |
| confidence | FLOAT64 | Review confidence from 0 to 1. |
| shadow_mode | BOOL, required | Always true in v1. |
| model_version | STRING | Sakana model. |
| prompt_version | STRING | Verifier contract version. |
| latency_ms | INT64 | API latency. |
| prompt_tokens / output_tokens | INT64 | Reported token usage. |

The proposed table is partitioned by `DATE(reviewed_at)` and clustered by
`verdict`, `finding_type`, and `symbol`.

# Producer

`magi-core/sekhmet-meta-verifier.js` via
`safeInsert('sekhmet_reviews', rows)`. No consumer is authorized in v1.
