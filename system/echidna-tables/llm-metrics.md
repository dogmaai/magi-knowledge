---
type: BigQuery Table
title: llm_metrics
description: Per-call telemetry — tokens, latency, cost, status for every LLM request.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=llm_metrics&page=table
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-23T11:57:51Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [echidna, bigquery, metrics, cost, telemetry]
dataset: magi_core
table_type: BASE TABLE
---

One row per LLM API call. Backs cost dashboards and the model health check.

# Schema

| Column | Type | Description |
|---|---|---|
| timestamp | TIMESTAMP | Call time. |
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| provider | STRING | Provider key. |
| model | STRING | Model id. |
| input_tokens | INT64 | Prompt tokens. |
| output_tokens | INT64 | Completion tokens. |
| response_time_ms | INT64 | Latency. |
| cost_usd | FLOAT64 | Computed cost. |
| status | STRING | `success` / `failed` / `truncated`, with historical NULLs — written by `magi-core/src/llm.js`; any non-`success` value is a failed or incomplete call. (Corrected 2026-10-23: previously documented as `ok` / error class, a spec–implementation drift.) |
| error_message | STRING | Error detail when failed. |

# Joins

* `provider` → [plm-units](/system/plm-units/) and [llm-config](llm-config.md)
* `session_id` → [sessions](sessions.md).session_id

# Citations

* Writer: unified LLM interface in `magi-core/src/llm.js`.
* Consumer: `magi-model-health-check`.
