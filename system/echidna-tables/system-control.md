---
type: BigQuery Table
title: system_control
description: Global emergency kill-switch state — the latest trading_halted row blocks all orders at L0 and at the magi-moomoo order gate.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=system_control&page=table
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-09-16T07:25:00Z }
verified: { by: devin/cli, at: 2026-09-16T07:25:00Z }
stale_after: 2027-03-16T07:25:00Z
tags: [echidna, bigquery, kill-switch, guard, l0]
dataset: magi_core
table_type: BASE TABLE
---

`system_control` is an append-only control log for the global trading halt.
Readers take the **latest row by `updated_at`**; `trading_halted=true` means
HALTED. Schema live-verified via `bq show` on 2026-09-16.

# Schema

| Column | Type | Description |
|---|---|---|
| updated_at | TIMESTAMP (REQUIRED) | When this control row was written. |
| trading_halted | BOOLEAN (REQUIRED) | `true` = global halt engaged. |
| reason | STRING | Free-text reason (e.g. `/kill` context). |
| updated_by | STRING | Actor that wrote the row. |

# Writers / readers

* **Writer**: AKA-1 ([magi-moni](/system/services/magi-moni.md)) engages the
  switch from Telegram with `/kill` and clears it with `/resume` (see
  [L0](/system/guards/l0-kill-switch.md)).
* **Readers**:
  * magi-core `lib/kill-switch.js` (`getKillSwitchState`) — the
    [L0](/system/guards/l0-kill-switch.md) emergency kill switch, which
    blocks all orders including exits before the shadow-mode branch.
  * the [magi-moomoo](/system/services/magi-moomoo.md) order gate, which
    maps the read to three states: `HALTED` (confirmed `true` → reject all
    orders including reducing ones, latched across subsequent read
    failures), `RUNNING` (confirmed `false`), `UNKNOWN` (read failure →
    reduce-only, fail-closed for non-reducing orders).
