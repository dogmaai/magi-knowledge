---
type: BigQuery Table
title: bridge_health_checks
description: Append-only liveness log for the broker path (magi-moomoo proxy → private VPC / Cloudflare tunnel → TIALA bridge → OpenD); written by the scheduled magi-bridge-monitor job and read back by it for alert transition/dedupe decisions.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=bridge_health_checks&page=table
lilith_safe: false
status: stable
generated: { by: devin/cli, at: 2026-10-19T10:30:00Z }
verified: [{ by: devin/cli, at: 2026-10-19T10:30:00Z }, { by: human:jun, at: 2026-10-20T08:44:00Z }]
stale_after: 2027-04-18T08:44:00Z
tags: [echidna, bigquery, monitoring, alerting, bridge]
dataset: magi_core
table_type: BASE TABLE
---

`bridge_health_checks` is the liveness log written by `bridge-monitor.js`
(magi-core, `ENTRY_POINT=bridge-monitor.js`, Cloud Scheduler
`magi-bridge-monitor-scheduler`). It exists because the magi-moomoo Cloud Run
proxy **cannot self-monitor** — Cloud Run freezes idle instances, so a
`setInterval` prober never fires reliably (`magi-moomoo/server.js` comment).
Motivation: the 2026-10-14 → 10-17 bridge outage (malformed `MOOMOO_ACC_ID`,
magi-moomoo#88) ran ~3.5 days with every unit session logging DEGRADED and no
human notified (magi-moomoo#89).

One row per scheduled run (every 15 min). The same table doubles as the
monitor's dedupe state: before writing, the job reads the latest row and the
latest `alerted='down'` row to decide whether to send Telegram.

# Probes (all read-only)

| probe | endpoint | proves |
|---|---|---|
| `tunnel_health` | `{opend-proxy service_endpoints url}/health` (public) | Cloudflare tunnel + bridge process alive |
| `route_status` | `{magi-moomoo url}/route_status` (OIDC) | private route state, fallback events |
| `positions_e2e` | `{magi-moomoo url}/trade/positions` (OIDC) | full trading path end to end |

# Overall classification

* `down` — the trading path is broken (`positions_e2e` failed, or the
  `service_endpoints` URLs could not be resolved at all — fail-loud).
* `degraded` — trading path works but one leg is out: tunnel probe failed
  while private carries traffic, `private_up=false`, or `route_status`
  unreachable.
* `ok` — all probes pass.

# Alert contract

* `ok|degraded → down`: Telegram `ALERT` immediately.
* `down` persists: re-alert every `DOWN_REALERT_HOURS` (default 6h), deduped
  via the latest `alerted='down'` row.
* `down → ok|degraded`: recovery `ALERT` with outage duration.
* `ok → degraded`: `OPS` category (muted by default → logged only).

# Schema

| Column | Type | Description |
|---|---|---|
| checked_at | TIMESTAMP | Run time; partition key (DATE). |
| overall | STRING | `ok` / `degraded` / `down`. |
| tunnel_url | STRING | Resolved `opend-proxy` URL probed. |
| proxy_url | STRING | Resolved `magi-moomoo` URL probed. |
| tunnel_http | INT64 | HTTP status of the tunnel /health probe. |
| tunnel_latency_ms | INT64 | Tunnel probe latency. |
| tunnel_error | STRING | Tunnel probe error (timeout, DNS, …). |
| route_status_http | INT64 | HTTP status of /route_status. |
| active_route | STRING | `private` / `cloudflare` from /route_status. |
| private_up | BOOL | `private_health.up` from /route_status. |
| positions_http | INT64 | HTTP status of the end-to-end positions probe. |
| positions_latency_ms | INT64 | Positions probe latency. |
| positions_error | STRING | Positions/resolve error detail. |
| alerted | STRING | `down` / `recovered` / `degraded` when an alert was sent for this check, else NULL. |

# Notes

* DDL: `magi-core/sql/create_bridge_health_checks.sql` (applied by Jun before
  the first scheduled run).
* The monitor exits 0 even when `overall=down` — the alert is the deliverable;
  a failing job and a failing bridge must stay distinguishable.
* Companion hardening: `MOOMOO_ACC_ID` startup validation (magi-moomoo#88).
