---
type: PLM Unit
title: MELCHIOR-1
description: Systematic multi-factor analyst; runs HERMES intelligence collection.
lilith_safe: false
tags: [plm, active, google, gemini, hermes]
provider: google
model: gemini-2.5-flash
status: active
budget_weight_normal: 0.954
---

# Overview

MELCHIOR-1 is a **systematic multi-factor analyst** — "your edge is thoroughness
and precision." It is the unit that triggers **HERMES intelligence collection**
(MELCHIOR-1-only) at the start of its cycle.

# Configuration

| Field | Value |
|---|---|
| Provider | `google` |
| Model | `gemini-2.5-flash` (override via `GEMINI_MODEL`) |
| Budget weight (NORMAL) | `0.954` (Optuna: high) |

# Relationships

* Writes/refreshes [market_research](/system/echidna-tables/market-research.md) via the HERMES stack.
* Gemini also powers the batch [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md) report.

# Trading history & performance

Query [trades](/system/echidna-tables/trades.md) where `unit_name='MELCHIOR-1'`.

# Citations

* `magi-core/src/session.js` (HERMES collection; persona).
* `magi-core/lib/config.js`.
