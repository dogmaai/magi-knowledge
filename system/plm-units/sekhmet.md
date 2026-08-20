---
type: PLM Unit
title: SEKHMET
description: Offline sequential/causal outcome analyzer (Sakana fugu-ultra); retired from the live PLM roster.
lilith_safe: false
tags: [plm, offline-analysis, causal, sakana, fugu]
provider: sakana
model: fugu-ultra
status: offline-analysis
budget_weight_normal: excluded
---

# Overview

SEKHMET is **MAGI's causal-analysis owner**. It was retired from the live PLM
roster and re-homed as an offline batch analyzer: the Cloud Run job
`magi-fugu-analyzer` (`ENTRY_POINT=fugu-analyzer.js`) reads the last 90 days of
WIN/LOSE trades joined to thoughts, preserves strict timestamp order, and asks
Sakana `fugu-ultra` for a structured sequential/causal reading of the outcomes.

Causal analysis belongs to SEKHMET, **not** to Gemini. See
[the causal-analysis ownership section](index.md#causal-analysis-ownership).

# Configuration

| Field | Value |
|---|---|
| Provider | `sakana` (in `DEPRECATED_PROVIDERS` — excluded from the live roster and from budget-weight loading) |
| Model | `fugu-ultra` (override via `SAKANA_MODEL`) |
| Job | Cloud Run job `magi-fugu-analyzer` |
| Schedule | Cloud Scheduler `magi-fugu-analyzer-daily`: `30 23 * * 1,5` `America/New_York` (Mon & Fri 23:30 ET) |
| Reasoning | `FUGU_REASONING_EFFORT=high` |
| Window / rows | 90 days, `FUGU_MAX_ROWS=80` |
| Output | [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md) + Telegram summary |

The Mon/Fri 23:30 ET slot runs after [DAPHNE](#relationships) (22:00 ET) and the
thought-outcome analyzer (23:00 ET), so the sequential pass sees the latest
feedback while keeping Sakana usage cost bounded.

# What it produces

The structured JSON response includes `causal_insights` (the causal reading of
recent win/lose streaks), winning/losing sequence signals, regime transitions,
a per-unit performance summary, improvement proposals, and a Japanese summary.

# Relationships

* Reads [trades](/system/echidna-tables/trades.md) × [thoughts](/system/echidna-tables/thoughts.md).
* Writes [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md).
* Distinct from `magi-daphne-analyzer`, which classifies LOSE trades into the LP
  taxonomy in BigQuery SQL and marks causal/non-causal from a static `IS_CAUSAL`
  map (no LLM causal inference).
* Distinct from `magi-gemini-analyzer`, which is generic win/lose pattern
  analysis — see [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md).

# Citations

* `magi-core/fugu-analyzer.js`.
* `magi-core/.github/workflows/deploy.yml` (`magi-fugu-analyzer`, `SAKANA_MODEL=fugu-ultra`, scheduler definition).
* `magi-core/lib/config.js` (`DEPRECATED_PROVIDERS` includes `sakana`; `getUnitName('sakana') === 'SEKHMET'`).
