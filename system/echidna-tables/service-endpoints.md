---
type: BigQuery Table
title: service_endpoints
description: Dynamic service discovery — current URL for each MAGI microservice.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=service_endpoints&page=table
lilith_safe: false
tags: [echidna, bigquery, service-discovery, ops]
dataset: magi_core
table_type: BASE TABLE
---

Service-discovery table: maps a service name to its current (Cloud Run) URL so
callers resolve endpoints at runtime instead of hard-coding them.

# Schema

| Column | Type | Description |
|---|---|---|
| service | STRING | Service name (e.g. `moomoo`, `price-tracker`, `isabel`). |
| url | STRING | Current base URL. |
| updated_at | STRING | Last update. |

# Joins

* `service` → [services/](/system/services/) docs.

# Citations

* Writer/reader: service registration + discovery in `magi-core/lib/bigquery.js` and each service's startup.
