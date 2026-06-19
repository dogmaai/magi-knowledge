---
type: BigQuery Table
title: llm_metrics
description: Per-call telemetry — tokens, latency, cost, status for every LLM request.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=llm_metrics&page=table
lilith_safe: false
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
| status | STRING | `ok` / error class. |
| error_message | STRING | Error detail when failed. |

# Joins

* `provider` → [plm-units](/system/plm-units/) and [llm-config](llm-config.md)
* `session_id` → [sessions](sessions.md).session_id

# Citations

* Writer: unified LLM interface in `magi-core/src/llm.js`.
* Consumer: `magi-model-health-check`.
