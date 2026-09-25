---
type: PLM Unit
title: ORACLE
description: DEPRECATED — Together.ai unit; removed in #139. The VIX-specialist name reuse was retired 2026-09-25.
lilith_safe: false
status: draft
generated: { by: devin/cloud, at: 2026-09-25T00:00:00Z }
verified: { by: human:jun, at: 2026-08-27T23:14:38Z }
stale_after: 2027-02-23T23:14:38Z
tags: [plm, deprecated, together, ollama, vix, retired]
provider: together
model: null
unit_status: deprecated
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

# ORACLE VIX specialist — RETIRED 2026-09-25

The **ORACLE name was also reused** for the VIX regime specialist, deployed as
the `magi-vix-oracle` Cloud Run job (`LLM_PROVIDER=ollama`, `MODE=VIX_ONLY`,
scheduled `magi-vix-premarket` at weekday 08:00 America/New_York). In
`magi-core/lib/vix.js`, `handleVixOnlyMode()` and `callOracleOllama()` called
the self-hosted Ollama endpoint (`qwen3.5:9b`) and wrote rows with
`unit_name: 'ORACLE'` into `magi_analytics_us.vix_comparison`. Those
historical rows are ORACLE VIX analysis, not trades from the deprecated
Together unit.

**Retired on 2026-09-25** (Jun-approved): the LLM analysis step and the
`magi-vix-oracle` job were removed. The successor is the deterministic
`runVixAggregation()` in `magi-core/lib/vix.js`, invoked daily by the
`magi-isabel-cache` job in the same 08:00 ET weekday slot: it resolves the
regime via `getVixRegime()` (Yahoo ^VIX primary) and writes
`vix_comparison` rows with `unit_name: 'HERMES'`, `llm_provider: 'none'` and
`together_analysis: NULL`. Per-symbol sVIX aggregation
(`calculateSymbolVix()` in `magi-core/src/isabel.js`, writing
`magi_analytics_us.symbol_vix`) moved to the same job with the Ollama
commentary removed (`together_analysis` now NULL).

# Citations

* `magi-core/lib/config.js` (`DEPRECATED_PROVIDERS`).
* `magi-core/lib/vix.js` (`runVixAggregation`; `handleVixOnlyMode` /
  `callOracleOllama` removed).
* `magi-core/isabel-cache.mjs` (daily VIX + sVIX aggregation).
* `magi-core/.github/workflows/deploy.yml` (`magi-vix-oracle` removed).
