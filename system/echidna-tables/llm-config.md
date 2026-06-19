---
type: BigQuery Table
title: llm_config
description: Provider/model registry — cost, status, successor, endpoint.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=llm_config&page=table
lilith_safe: false
tags: [echidna, bigquery, config, providers]
dataset: magi_core
table_type: BASE TABLE
---

Reference registry of providers/models with cost and lifecycle metadata. The
authoritative *runtime* unit→provider→model mapping lives in
`magi-core/lib/config.js`; this table is the cost/lifecycle catalog and lists
additional available/backup models.

# Schema

| Column | Type | Description |
|---|---|---|
| provider | STRING | Provider key. |
| model | STRING | Model id. |
| status | STRING | `active` / `available` / `deprecated`. |
| successor | STRING | Replacement model when deprecated. |
| api_endpoint | STRING | API base URL. |
| cost_per_1m_input | FLOAT64 | $ / 1M input tokens. |
| cost_per_1m_output | FLOAT64 | $ / 1M output tokens. |
| deprecated_date | DATE | Deprecation date. |
| notes | STRING | Free-text notes. |
| updated_at | TIMESTAMP | Last update. |

# Joins

* `provider` → [plm-units](/system/plm-units/), [llm-metrics](llm-metrics.md)

# Citations

* Runtime mapping: `magi-core/lib/config.js` (`getUnitName`, `BUDGET_WEIGHTS`).
