---
type: BigQuery View
title: trades_active / thoughts_active
description: Active-filtered VIEWs over the base trades and thoughts tables.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=trades_active&page=table
lilith_safe: false
tags: [echidna, bigquery, view]
dataset: magi_core
table_type: VIEW
---

`trades_active` and `thoughts_active` are VIEWs (confirmed via
`INFORMATION_SCHEMA.TABLES.table_type = 'VIEW'`) over the base
[trades](trades.md) and [thoughts](thoughts.md) tables. Read paths should prefer
the views; the base tables are the write targets.

# Why views exist

The views present the "active" slice (current trade universe / non-archived
rows) so consumers don't have to re-implement the active filter. Columns mirror
the underlying base tables.

# Consumers

* ISABEL stats blocks (`<ISABEL_STATS_BLOCK>`) are computed from `trades_active`.
* `lilith-training` reads `trades_active` and `thoughts_active` for the
  anti-hallucination `rejected`-example extraction.

# Note

Because views expose **all units'** rows, anything derived directly from them is
cross-unit and therefore `lilith_safe: false`. The LILITH pipeline must scope to
its own `unit_name` before any value reaches a training prompt — see the
[clean-source rule](/_lilith_safe/constitution/clean-source-rule.md).
