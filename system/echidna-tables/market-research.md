---
type: BigQuery Table
title: market_research
description: HERMES/ARIEL research cache — sentiment and key events.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=market_research&page=table
lilith_safe: false
tags: [echidna, bigquery, hermes, research]
dataset: magi_core
table_type: BASE TABLE
---

Cache of market research produced by the HERMES stack and ARIEL. **Must never
reach LILITH** — it is processed cross-source intelligence.

Also receives the weekday daily Deep Research brief via
[magi-deep-research](/system/services/magi-deep-research.md)
(`research_type = 'DAILY_DEEP_RESEARCH'`).

# Schema

| Column | Type | Description |
|---|---|---|
| date | DATE | Research date. |
| research_type | STRING | e.g. `MACRO`, `SYMBOL`, `DAILY_DEEP_RESEARCH`. |
| symbol | STRING | Ticker (nullable for macro). |
| summary | STRING | Text summary. |
| sentiment | STRING | Sentiment label. |
| risk_level | STRING | Risk label. |
| key_events | JSON | Structured event list. |
| raw_data | JSON | Raw payload. |
| created_at | TIMESTAMP | Insert time. |
| source_agent | STRING | Producing agent. Examples: `HERMES`, `ARIEL`, `devin_automation`. For `DAILY_DEEP_RESEARCH` rows the default is `devin_automation`, overridable via `DEEP_RESEARCH_SOURCE_AGENT`. |
| box_file_id / box_url | STRING | Box document refs. |
| gcs_uri | STRING | GCS object uri. |
| word_count | INT64 | Summary length. |
| session_id | STRING | Associated session. |
| execution_duration_sec | INT64 | Agent runtime. |
| search_query_count | INT64 | Searches performed. |
| estimated_cost_usd | FLOAT64 | Estimated cost. |
| prompt_version | STRING | Prompt version. |
| status | STRING | Pipeline status. |
| assessment_score | INT64 | Quality assessment. |

# Joins

* `session_id` → [sessions](sessions.md).session_id

# Citations

* Writer: `magi-core/src/hermes.js` (`saveToBigQuery`).
* Writer: `magi-core/scripts/upload-deep-research.mjs` for `DAILY_DEEP_RESEARCH` rows.
