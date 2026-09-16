---
type: BigQuery Table
title: moomoo_snapshots
description: HERMES:MOOMOO broker real-time market snapshots — one row per symbol per fetch.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=moomoo_snapshots&page=table
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-16T01:30:00Z }
verified: { by: devin/local, at: 2026-09-16T01:30:00Z }
stale_after: 2027-03-16T01:30:00Z
tags: [echidna, bigquery, hermes, moomoo, market-data]
dataset: magi_core
table_type: BASE TABLE
---

`moomoo_snapshots` stores every snapshot row returned by `getMoomooSnapshot()`
(via the magi-moomoo proxy → OpenD bridge) so `[HERMES:MOOMOO]` broker
real-time data is permanently available for back-testing, ISABEL analysis
and sVIX calibration. Each row is one symbol at one fetch timestamp; all
rows in a fetch batch share one `snapshot_id`. Partitioned by
`DATE(snapshot_ts)`.

The writer fires asynchronously after the prompt-formatting path — a BQ
failure never blocks the PLM trade session.

# Schema

| Column | Type | Description |
|---|---|---|
| id | STRING | UUID per row. |
| snapshot_id | STRING | UUID shared by all rows in a single fetch batch. |
| symbol | STRING | Ticker. |
| last_price | FLOAT64 | Last traded price. |
| open / high / low / prev_close | FLOAT64 | OHLC + previous close. |
| change / change_pct | FLOAT64 | Price change vs prev_close (absolute / %). |
| volume | INT64 | Traded volume. |
| turnover | FLOAT64 | Traded turnover (currency). |
| bid / ask / spread | FLOAT64 | Best bid / ask / spread. |
| timestamp | STRING | Timestamp string from MooMoo OpenD (broker time). |
| snapshot_ts | TIMESTAMP | When magi-core captured the snapshot (UTC). Partition key. |

# Citations

* DDL: `magi-core/sql/create_moomoo_snapshots.sql`.
* Writer: `magi-core/src/hermes.js` (`saveMoomooSnapshotToBQ`), driven by
  `magi-hermes-refresh` and the in-session path.
* Readers: `src/hermes.js` (`[HERMES:MOOMOO]` prompt block), the
  `magi-hermes-intelligence` Grafana dashboard ("Broker Reality" section).
