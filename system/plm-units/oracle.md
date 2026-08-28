---
type: PLM Unit
title: ORACLE
description: DEPRECATED — Together.ai unit; removed in #139.
lilith_safe: false
tags: [plm, deprecated, together, ollama, vix]
provider: together
model: null
status: deprecated
deprecated_pr: "#139"
---

# Overview

ORACLE was the **Together.ai** unit. It was **deprecated in #139**. `together`
is in `DEPRECATED_PROVIDERS` and is excluded from budget-weight loading.

It is retained here for historical attribution: older
[trades](/system/echidna-tables/trades.md) /
[thoughts](/system/echidna-tables/thoughts.md) rows may carry
`unit_name='ORACLE'`.

# Configuration

| Field | Value |
|---|---|
| Provider | `together` (DEPRECATED) |
| Budget weight | excluded (`DEPRECATED_PROVIDERS`) |

# ORACLE VIX specialist

The **ORACLE name is also reused** for the VIX regime specialist. In
`magi-core/lib/vix.js`, `handleVixOnlyMode()` and `callOracleOllama()` call the
self-hosted Ollama endpoint at `OLLAMA_BASE_URL` through a Tailscale Funnel,
without an auth header. They set `reasoning_effort: 'none'` because thinking
models otherwise return empty content, and use `qwen3.5:9b` by default.

This path writes rows with `unit_name: 'ORACLE'` into
`magi_analytics_us.vix_comparison`. It is deployed as the `magi-vix-oracle`
job with `LLM_PROVIDER=ollama` and `MODE=VIX_ONLY`, scheduled at weekday
08:00 America/New_York pre-market. These rows are ORACLE VIX analysis, not
trades from the deprecated Together unit.

# Citations

* `magi-core/lib/config.js` (`DEPRECATED_PROVIDERS`).
* `magi-core/lib/vix.js` (`handleVixOnlyMode`, `callOracleOllama`).
* `magi-core/.github/workflows/deploy.yml` (`magi-vix-oracle`).
