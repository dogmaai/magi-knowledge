---
type: BigQuery Table
title: portfolio_snapshots
description: Per-session-end portfolio snapshot (equity, cash, positions value, session equity delta) written by the magi-core unit session lifecycle and consumed by the Grafana portfolio and broker-sync dashboards.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=portfolio_snapshots&page=table
lilith_safe: false
status: draft
generated: { by: codex/cloud, at: 2026-10-28T14:00:34Z }
verified: [{ by: devin/cli, at: 2026-10-26T10:36:00Z }]
stale_after: 2027-04-26T10:36:00Z
tags: [echidna, bigquery, portfolio, grafana]
dataset: magi_core
table_type: BASE TABLE
---

> **Draft — schema captured live from `INFORMATION_SCHEMA` on 2026-10-26;
> writer semantics verified against magi-core `7e8cfd9`
> (`lib/session-lifecycle.js`).** Awaiting human:jun verification.

One row per **unit session end** (`writeSessionEndRows`), written alongside the
corresponding `sessions` row. Sessions only run during US market hours, so
overnight and weekend gaps are expected — consumers must treat the latest row
as *the last session-end snapshot*, not a live quote of account state.
Account values come from the bridge `account_info` read at session end.

# Schema (live, 2026-10-26 — no partitioning, no clustering)

| Column | Type | Description |
|---|---|---|
| `timestamp` | TIMESTAMP | Session end time. |
| `equity` | FLOAT64 | Broker equity at session end. |
| `cash` | FLOAT64 | Broker cash at session end. |
| `positions_value` | FLOAT64 | Broker `long_market_value` at session end (0 when flat). |
| `daily_pnl` | FLOAT64 | **Session** equity delta — see naming drift below. |
| `total_pnl_percent` | FLOAT64 | Session delta as % of session-start equity — same drift. |

# Naming drift (documented, intentionally unresolved)

`daily_pnl` and `total_pnl_percent` are named as daily/total aggregates but the
writer stores **per-session** values (`endingEquity − startingEquity` of that
single session, typically a ~4–20 minute window; multiple sessions per unit
per day). Grafana panels previously mislabeled these — corrected at the query
layer (magi-core#668), which derives daily P&L as the day-over-day delta of
each trading day's last-snapshot equity.

Provisioning drift (found 2026-10-28): the #668 query fixes were merged into
`magi-core/grafana/portfolio-chart.json` but never provisioned, so the live
dashboard kept the session-delta panels until it was synced on 2026-10-28
(magi-core PR `claude/portfolio-align-moomoo-app`).

**Fallback rows**: when MooMoo is unreachable at session end the writer stores
`equity = startingEquity`, `cash = 0`, `positions_value = 0` (46 rows in the
30 days to 2026-10-28). The snapshot queries in
`magi-core/grafana/portfolio-chart.json` (#680) use `equity > 0` and
`NOT (IFNULL(cash,0) = 0 AND IFNULL(positions_value,0) = 0)`.
This is the verified scope; it is not a guarantee that broker-sync or custom
consumers apply the same filter. Check each consumer query independently.
The condition is a heuristic, not a writer-supplied validity flag: it also
excludes a genuine zero-cash/zero-position row (and treats nulls as zero).
Do not interpret an excluded row as proof of an outage or use the filter
to certify account solvency. Adding a provenance flag is a separate
writer/schema change; none is introduced here.

**MooMoo app alignment (Jun, 2026-10-28)**: the demo app's 損益合計 / 損益率
are measured against the account's initial capital of **$1,000,000**
(app 2026-10-28: +68,797.80 / +6.88%). The dashboard derives them as
`equity − initial_capital` and `equity / initial_capital − 1` (dashboard
constant `initial_capital`); 当日損益 is the day-over-day equity delta per
America/New_York trading day. Values are session-end snapshots, so they lag
the app's live quotes until the next session.

`initial_capital` is a hidden Grafana constant (`type: constant`, `hide: 2`,
`query: "1000000"`) in `grafana/portfolio-chart.json`, not a BigQuery column
or an automatically discovered balance. Its value can be changed by editing
that dashboard definition and provisioning it through the normal process.
Changing it recalculates total P&L and total P&L % for every displayed
snapshot; it does not rewrite snapshot equity or change daily equity deltas.

**Open reconciliation**: the 2026-10-28 app cash/stock allocation
(96.65% / 3.35%) differs from bridge `cash` / `market_val` (about
92.6% / 7.4%). Cause is unverified; fees, FX and valuation differences are
hypotheses, not findings. Allocation panels are not yet verified to match
the app; no correction factor should be inferred from these percentages.
Before claiming full app alignment, compare the same account/environment,
currency and observation time in the app's assets tab and bridge account
response; reconcile the individual positions and field definitions, then
check the corresponding snapshot and dashboard query. This discrepancy
concerns the cash/stock breakdown; the total-equity P&L formula is separate
but still depends on the accuracy and time of the broker equity input.

Renaming the columns or changing the writer is **deferred** — it would
redefine every historical row. Consumers must not read `daily_pnl` as a daily
aggregate. Any semantic change is a separate Jun decision.

# Consumers

- Grafana `magi-portfolio-chart` — stat panels, equity curve, daily P&L.
- Grafana `magi-broker-sync` — snapshot freshness and latest-row panels
  (magi-core#668; freshness thresholds per
  [data-freshness-expectations](data-freshness-expectations.md), draft).

