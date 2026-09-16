---
type: BigQuery Table
title: focus_symbols
description: ISABEL daily focus symbols ranked by historical win rate — the dynamic HERMES collection universe.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=focus_symbols&page=table
lilith_safe: false
status: draft
generated: { by: devin/local, at: 2026-09-16T01:30:00Z }
verified: { by: devin/local, at: 2026-09-16T01:30:00Z }
stale_after: 2027-03-16T01:30:00Z
tags: [echidna, bigquery, isabel, hermes, symbols]
dataset: magi_core
table_type: BASE TABLE
---

`focus_symbols` stores the daily ranked list of symbols that ISABEL
identifies as the best statistical edge from `magi_core.trades`. HERMES
reads this table when `HERMES_COLLECTION_SYMBOLS` is not set, so the
news/sentiment collection universe follows historical performance instead
of a static symbol list.

The writer (`isabel-cache.mjs`, Cloud Run job `magi-isabel-cache`,
Scheduler `magi-isabel-cache-daily`, `0 8 * * 1-5` America/New_York) runs
once per trading day and replaces that day's rows (DELETE + batch insert).
The reader (`src/hermes.js` `getHermesCollectionSymbols()`) filters on the
current ET date and caps the ISABEL list at `HERMES_FOCUS_MAX_SYMBOLS`
(default 20). User-pinned `manual_focus_symbols` rows (added via the AKA-1
Telegram bot) are unioned ahead of this list and are not counted against
the cap; SPY/QQQ are always appended for tape bias. When no rows exist for
today the reader falls back to the 12-symbol `INTELLIGENCE_SYMBOLS`
default. Partitioned by `date`.

# Schema

| Column | Type | Description |
|---|---|---|
| date | DATE | ET market date this focus set was generated for. Partition key. |
| symbol | STRING | Ticker selected by ISABEL. |
| win_rate | FLOAT64 | Historical win rate (0-100). |
| wins | INT64 | Resolved winning trades. |
| loses | INT64 | Resolved losing trades. |
| total | INT64 | Resolved trades (wins + loses). |
| rank | INT64 | Rank by win_rate DESC, then total DESC. |
| created_at | TIMESTAMP | Write time (UTC). |

# Citations

* DDL: `magi-core/sql/create_focus_symbols.sql`.
* Writer: `magi-core/isabel-cache.mjs` (`magi-isabel-cache` job).
* Readers: `src/hermes.js` (`queryDailyFocusSymbols`), the
  `magi-hermes-intelligence` Grafana dashboard (coverage panel + `$symbol`
  template variable).
