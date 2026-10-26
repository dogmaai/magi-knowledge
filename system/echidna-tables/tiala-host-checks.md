---
type: BigQuery Table
title: tiala_host_checks
description: Append-only liveness log for TIALA host metrics (Alloy prometheus.exporter.unix → grafanacloud-aka-prom); written by the scheduled magi-tiala-host-monitor job and read back by it for alert transition/dedupe decisions.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=tiala_host_checks&page=table
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-10-26T11:40:00Z }
stale_after: 2027-01-26T11:40:00Z
tags: [echidna, bigquery, monitoring, alerting, tiala]
dataset: magi_core
table_type: BASE TABLE
---

`tiala_host_checks` is the liveness log written by `tiala-host-monitor.js`
(magi-core, `ENTRY_POINT=tiala-host-monitor.js`, Cloud Scheduler
`magi-tiala-host-monitor-scheduler`) — the TIALA counterpart of
[bridge_health_checks](bridge-health-checks.md) (magi-core#667).
**Status: proposed — pending Jun approval** (magi-core#669; the job and
scheduler extend the original #667 decision — disk-85% Telegram alert —
into a new job + scheduler + this table; the DDL was applied by Jun
2026-10-26 ahead of that approval). It exists
because the `com.magi.alloy` LaunchAgent exits 0 — no restart loop — when its
config is incomplete, so the agent can silently stop shipping metrics; the
only reliable signal is "did `job="tiala-host"` samples reach
`grafanacloud-aka-prom`".

One row per scheduled run (every 15 min). The same table doubles as the
monitor's dedupe state: before writing, the job reads the latest row and the
latest `alerted='down'` row to decide whether to send Telegram (shared
`lib/monitor-common.js` helpers — same transition/dedupe semantics as
`bridge-monitor.js`).

# Probes (all read-only, instant PromQL via the Grafana datasource proxy)

| probe | expression | proves |
|---|---|---|
| metrics freshness | `time() - max(timestamp(node_time_seconds{job="tiala-host"}))` | Alloy agent + remote_write path alive |
| root disk usage | `max(100 * (1 - node_filesystem_avail_bytes{job="tiala-host",mountpoint="/"} / node_filesystem_size_bytes{job="tiala-host",mountpoint="/"}))` | root filesystem below the 85% alert line |

# Overall classification

* `down` — either leg down: freshest sample older than `STALE_SECONDS`
  (default 900) **or** root usage at/above `DISK_THRESHOLD_PCT` (default 85).
* `ok` — otherwise. A failed PromQL query marks the leg `unknown`, never
  `down` (the monitor's own path to Grafana breaking must not page Jun);
  `unknown` legs are recorded in `stale_leg`/`disk_leg`/`query_error`.

# Alert contract

* `ok → down`: Telegram `ALERT` immediately.
* `down` persists: re-alert every `DOWN_REALERT_HOURS` (default 6h), deduped
  via the latest `alerted='down'` row.
* `down → ok`: recovery `ALERT` with outage duration.
* `unknown` leg persists: alert after `UNKNOWN_ALERT_MINUTES` (default 180)
  then on the `DOWN_REALERT_HOURS` cadence (`alerted='unknown'`) — a
  permanently failing Grafana query path must not go silent.

# Schema

| Column | Type | Description |
|---|---|---|
| checked_at | TIMESTAMP | Run time; partition key (DATE). |
| overall | STRING | `ok` / `down` (no `degraded` — see classification). |
| metrics_age_seconds | FLOAT64 | Age of the newest `tiala-host` sample (NULL if absent). |
| disk_used_pct | FLOAT64 | Root-filesystem usage percent (NULL if absent). |
| stale_leg | STRING | `ok` / `down` / `unknown`. |
| disk_leg | STRING | `ok` / `down` / `unknown`. |
| query_error | STRING | Grafana/PromQL query failure detail, if any. |
| alerted | STRING | `down` / `recovered` / `unknown` when an alert was sent for this check, else NULL. |

# Notes

* DDL: `magi-core/sql/create_tiala_host_checks.sql` (applied by Jun before
  the first scheduled run).
* Same condition pair is also provisioned as Grafana alert rules
  (`tiala-alloy-metrics-stale`, `tiala-disk-usage-high`) by
  `grafana/provision-tiala-alerts.mjs` — those rules give the alerts a home
  in the Grafana UI/email; **Telegram delivery is this job's**, because the
  stack's notification routing only has the GCP-Alerts-email receiver.
* The monitor exits 0 even when `overall=down` — the alert is the
  deliverable; a failing job and a failing host must stay distinguishable.
