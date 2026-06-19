---
type: Service
title: magi-model-health-check
description: Periodic provider/model health checks across the PLM roster.
lilith_safe: false
tags: [service, health-check, providers, ops]
repo: dogmaai/magi-model-health-check
---

# Overview

Periodically pings each configured provider/model to verify availability,
latency, and cost behaviour, so degraded providers can be flagged before they
affect live trading.

# Reads / relates to

* [llm-config](/system/echidna-tables/llm-config.md) — registry of providers/models.
* [llm-metrics](/system/echidna-tables/llm-metrics.md) — telemetry baseline.
* [plm-units](/system/plm-units/) — the roster under test.

# Note

Expand with the concrete health-check schedule and output table in a follow-up
pass.
