---
type: BigQuery Table
title: service_endpoints
description: Dynamic service discovery — current URL for each MAGI microservice.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=service_endpoints&page=table
lilith_safe: false
status: draft
generated: { by: claude/cloud, at: 2026-11-25T02:50:00Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [echidna, bigquery, service-discovery, ops]
dataset: magi_core
table_type: BASE TABLE
---

> Revision note (2026-11-25, claude/cloud — **not human-verified**): added
> the magi-moomoo URL cache / back-off / fallback below (magi-core#731,
> `133fd97`; read at `63888b2`). Doc is `draft` until Jun re-verifies; the
> retained `verified` entry covers the earlier revision, and
> `stale_after` is unchanged.

Service-discovery table: maps a service name to its current (Cloud Run) URL so
callers resolve endpoints at runtime instead of hard-coding them.

# Schema

| Column | Type | Description |
|---|---|---|
| service | STRING | Service name (e.g. `moomoo`, `price-tracker`, `isabel`). |
| url | STRING | Current base URL. |
| updated_at | STRING | Last update. |

# Resolution of the magi-moomoo URL (magi-core#729 item 5)

The table stays the source of truth. `getMoomooUrl()` in
`magi-core/lib/moomoo.js` used to query it on every broker call with no
fallback, so a BigQuery outage also stopped the stop-loss path from reading
positions. Order of resolution:

1. a value resolved from this table within the last **10 minutes**
   (in-process cache);
2. otherwise a fresh lookup (latest `updated_at` for `service='magi-moomoo'`),
   which refreshes the cache;
3. on lookup **failure only**: the last value resolved in this process, then
   the `MOOMOO_URL_FALLBACK` env var. If neither exists the original error
   propagates unchanged.

After a failure that fell back, the table is **not re-queried for 60
seconds** (back-off), so an outage does not make every broker call wait for
the lookup to fail again. `MOOMOO_URL_FALLBACK` must be an `https` URL
(trailing slashes trimmed; anything else is ignored) and is **unset by
default** — with no fallback and a cold cache, a lookup failure still fails
the call. Whether a deployment sets it was not inspected.

# Joins

* `service` → [services/](/system/services/) docs.

# Citations

* Writer/reader: service registration + discovery in `magi-core/lib/bigquery.js` and each service's startup.
* magi-moomoo reader with cache and fallback: `magi-core/lib/moomoo.js`
  (`getMoomooUrl`).
