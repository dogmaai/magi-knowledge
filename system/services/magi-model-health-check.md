---
type: Service
title: magi-model-health-check
description: Periodic provider/model health checks across the PLM roster.
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-10-22T01:19:45Z }
verified: { by: human:jun, at: 2026-06-19T01:02:48Z }
stale_after: 2026-12-16T01:02:48Z
tags: [service, health-check, providers, ops]
repo: dogmaai/magi-core
---

# Overview

Periodically pings each configured provider/model to verify availability,
latency, and cost behaviour, so degraded providers can be flagged before they
affect live trading.

The implementation is the `magi-llm-health-monitor` Cloud Run job in
`magi-core` (`health-monitor.js` at the repo root — no standalone
`magi-model-health-check` repo exists). Coverage note (2026-10-20, Claude
review): the monitor probes the five hosted LLM providers only (google,
deepseek, qwen, kimi, openai — `PROVIDERS` in `health-monitor.js`); the Ollama
units (ADAM/BOREAS on TIALA), the HERMES Gemini model, and the Cohere
models are not covered by the synthetic probes. Update (observed 2026-11-13,
magi-core `4b57047`, not human-verified): the job also scans `llm_metrics` for
per-provider failure streaks of the real call path (`checkMetricsStreaks`,
`lib/llm-metrics-streak.js`; alert at 3 consecutive failures, then every 20),
which covers `ollama`; it delivered two `ollama` streak alerts to Discord on
2026-11-13. The `llm_health_checks` output table exists in
`magi_core` but remains uncatalogued (see the drift backlog in
[echidna-tables/index.md](/system/echidna-tables/index.md)).

# Reads / relates to

* [llm-config](/system/echidna-tables/llm-config.md) — registry of providers/models.
* [llm-metrics](/system/echidna-tables/llm-metrics.md) — telemetry baseline.
* [plm-units](/system/plm-units/) — the roster under test.

# Note

Expand with the concrete health-check schedule and output table in a follow-up
pass.
