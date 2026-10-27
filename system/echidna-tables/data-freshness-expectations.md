---
type: Policy
title: Data freshness expectations (draft proposal)
description: Proposed staleness thresholds for the moomoo data pipeline — probe tables and session-driven tables — so dashboards and reviewers can distinguish stale data from current state.
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-26T10:36:00Z }
verified: [{ by: devin/cli, at: 2026-10-26T10:36:00Z }]
stale_after: 2027-04-26T10:36:00Z
tags: [echidna, observability, freshness, grafana, proposed]
---

> **Draft proposal — values derived from observed write cadence, not yet
> validated against an incident or formally agreed.** Until human:jun
> verifies this doc, treat the numbers below as a working hypothesis.

Staleness is judged by **time since last write**, distinct from "last observed
value". A missing or stale value must never be presented as a current/healthy
one — this is the display contract the dashboards follow.

# Proposed thresholds

| Signal | Source | Write cadence | amber | red |
|---|---|---|---|---|
| Broker-path probe age | `bridge_health_checks` | every 15 min | > 20 min | > 60 min |
| TIALA host-metrics age | `tiala_host_checks` / `node_*` on `job="tiala-host"` | every 15 min | > 20 min | > 60 min (display tiers — the *alert* thresholds are tighter: 15 min stale / 85% disk in [tiala_host_checks](tiala-host-checks.md) and the provisioned Grafana rules; alerting vs display thresholds intentionally differ) |
| Session-driven table age | `portfolio_snapshots`, `sessions` | per session end, US market hours only | > 25 h | > 72 h |
| Market-data snapshot age | `moomoo_snapshots` | hourly during market hours | > 12 h | > 72 h |

Rationale: 20/60 min distinguishes a skipped probe run from a stopped monitor;
25/72 h tolerates overnight and weekend session gaps (sessions do not run on
weekends — a Saturday evening read is expected to show > 24 h). `order_fills`
is intentionally un-thresholded — fills are sparse and long gaps are normal.

# Referenced by

- `grafana/magi-broker-sync.json` and the freshness panels on
  `grafana/portfolio-chart.json` in magi-core (magi-core#668) use these
  thresholds as their color boundaries — this document is the single
  reference; the Grafana JSON must not carry a divergent copy of the values.

# Open questions

- Whether alerting (not just display) should key off these thresholds —
  out of scope of this proposal.
- Whether session tables need a market-hours-aware evaluation rather than
  absolute age (current values are absolute; weekend red is by design).
