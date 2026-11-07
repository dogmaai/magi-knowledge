---
type: BigQuery Table
title: thoughts_shadow
description: Reasoning rows for virtual orders in trades_shadow — one row per shadow BUY/SELL, written in the same call and keyed by the same thought_id. Not the general SHADOW-unit reasoning log.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=thoughts_shadow&page=table
lilith_safe: false
status: draft
generated: { by: claude/opus-5-5, at: 2026-11-07T04:33:35Z }
stale_after: 2027-05-07T04:33:35Z
tags: [echidna, bigquery, thoughts, shadow, counterfactual]
dataset: magi_core
table_type: BASE TABLE
---

> **Draft — catalogued 2026-11-07 from the live DDL (`INFORMATION_SCHEMA.TABLES`)
> and magi-core `e991ce1db9a0c5043c26d19e0c407da3f6f4420d`.** Not yet
> human-verified. Previously listed under *Live tables not yet catalogued* in
> the [ECHIDNA index](index.md).

`thoughts_shadow` is the reasoning half of the shadow ledger pair. Each row is
written together with one [trades_shadow](trades-shadow.md) row and shares its
`thought_id`.

**It is not where SHADOW units log their analysis.** A SHADOW unit's
`log_analysis` rows — every analysed symbol, including `HOLD` — go to
[thoughts](thoughts.md) with `trade_mode='SHADOW'`. Only `place_order`
decisions (and `L6_OBSERVE` candidates) produce a `thoughts_shadow` row. See
[MELCHIOR-1 SHADOW write paths](/system/plm-units/melchior-1.md#shadow-write-paths).
So a SHADOW session that only holds writes nothing here.

# Producers

Same as [trades_shadow](trades-shadow.md#producers): `place_order` under
`TRADE_MODE=SHADOW` (`trade_mode='SHADOW'`) and `recordL6ShadowCandidate`
(`trade_mode='L6_OBSERVE'`), both building the row with
`lib/shadow-trade.js` `buildShadowDecisionRows`. Legacy LILITH rows
(`trade_mode='NORMAL'`, 27 rows, 2026-07-22 → 2026-07-28) have no current
producer.

# Schema

Live DDL, 2026-11-07. A subset of [thoughts](thoughts.md): no `id`,
`decision_id`, `model_version`, `side`, `ariel_context_used` or
`feedback_injected`.

| Column | Type | Description |
|---|---|---|
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| timestamp | TIMESTAMP | Decision time (UTC); equals the paired `trades_shadow.timestamp`. |
| content | STRING | `[<symbol>] <ACTION> - <reasoning>`. |
| trade_mode | STRING | `SHADOW` / `L6_OBSERVE`; `NORMAL` on legacy LILITH rows. |
| llm_provider | STRING | Provider key. |
| unit_name | STRING | MAGI unit name. |
| symbol | STRING | Ticker. |
| action | STRING | `BUY` / `SELL` (never `HOLD`). |
| reasoning | STRING | Last reasoning, falling back to the order reason. |
| hypothesis | STRING | Empty string from the current producers. |
| confidence | FLOAT64 | Confidence for the symbol; `0` when unavailable. |
| concerns | STRING | Empty string from the current producers. |
| prompt_version | STRING | Prompt version at decision. |
| thought_id | STRING | Join key → [trades_shadow](trades-shadow.md) and the analysis row in [thoughts](thoughts.md). |
| vix_estimate | FLOAT64 | VIX estimate at decision. |
| vix_regime | STRING | VIX regime label. |
| reasoning_content | STRING | Extended chain-of-thought (when provided). |

# Reading the shadow decision

For the full reasoning behind a shadow order, join to the analysis row in
`thoughts` by `thought_id`; `thoughts_shadow` keeps only a short summary
(`hypothesis` and `concerns` are empty).

# Citations

* `magi-core/src/llm.js` (SHADOW `place_order`; `recordL6ShadowCandidate`).
* `magi-core/lib/shadow-trade.js` (`buildShadowDecisionRows`).
* Live DDL: `INFORMATION_SCHEMA.TABLES.ddl` for `magi_core.thoughts_shadow`, read 2026-11-07.
