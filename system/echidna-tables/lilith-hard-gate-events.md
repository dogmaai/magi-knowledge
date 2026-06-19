---
type: BigQuery Table
title: lilith_hard_gate_events
description: Audit log of LILITH VIX hard-gate action rewrites (e.g. BUY blocked in EXTREME_FEAR).
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=lilith_hard_gate_events&page=table
lilith_safe: false
tags: [echidna, bigquery, lilith, vix, guard, audit]
dataset: magi_core
table_type: BASE TABLE
---

Audit trail of the VIX hard-gate rewriting a LILITH action (e.g. forcing a BUY
to HOLD/SELL under `EXTREME_FEAR`). This is an *operational audit* of LILITH in
production — it is **not** training input and is `lilith_safe: false`.

# Schema

| Column | Type | Description |
|---|---|---|
| timestamp | TIMESTAMP | Event time. |
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| decision_id | STRING | Decision identifier. |
| symbol | STRING | Ticker. |
| vix_regime | STRING | Regime at decision. |
| vix_level | FLOAT64 | VIX level. |
| original_action | STRING | Action LILITH produced. |
| rewritten_action | STRING | Action after the hard gate. |
| reason | STRING | Why the gate fired. |
| lilith_version | STRING | LILITH model version. |
| raw_completion | STRING | Raw model output. |

# Joins

* `session_id` → [sessions](sessions.md).session_id

# Citations

* Logic: VIX gating in `magi-core/src/vix.js` + LILITH path. See [risk-rules](/_lilith_safe/constitution/risk-rules.md) for the regime→bias mapping.
