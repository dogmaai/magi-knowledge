---
type: BigQuery Table
title: consensus_signals
description: Cross-unit consensus detector — when multiple units agree on a symbol/side.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=consensus_signals&page=table
lilith_safe: false
tags: [echidna, bigquery, consensus, cross-unit]
dataset: magi_core
table_type: BASE TABLE
---

Records when several MAGI units independently converge on the same symbol/side.
This is **intrinsically cross-unit** and must never inform LILITH.

# Schema

| Column | Type | Description |
|---|---|---|
| timestamp | TIMESTAMP | Detection time. |
| date | DATE | Detection date. |
| symbol | STRING | Ticker. |
| side | STRING | `buy` / `sell`. |
| llm_count | INT64 | Number of units agreeing. |
| llms | STRING | Comma-separated unit list. |
| session_ids | STRING | Contributing sessions. |
| acted | BOOL | Whether the system acted on the consensus. |

# Joins

* `session_ids` → [sessions](sessions.md).session_id (multi)

# Citations

* Writer: consensus detection in `magi-core` session aggregation.
