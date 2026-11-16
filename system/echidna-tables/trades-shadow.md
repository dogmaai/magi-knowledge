---
type: BigQuery Table
title: trades_shadow
description: Virtual-order ledger — BUY/SELL decisions that were recorded instead of sent to the broker (SHADOW units, L6_OBSERVE candidates, legacy LILITH), later marked WIN/LOSE/HOLD by magi-shadow-evaluator.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=trades_shadow&page=table
lilith_safe: false
status: draft
generated: { by: claude/opus-5-5, at: 2026-11-07T04:33:35Z }
stale_after: 2027-05-07T04:33:35Z
tags: [echidna, bigquery, trades, shadow, counterfactual]
dataset: magi_core
table_type: BASE TABLE
---

> **Draft — catalogued 2026-11-07 from the live DDL (`INFORMATION_SCHEMA.TABLES`)
> and magi-core `e991ce1db9a0c5043c26d19e0c407da3f6f4420d`.** Not yet
> human-verified. Previously listed under *Live tables not yet catalogued* in
> the [ECHIDNA index](index.md).

`trades_shadow` holds orders that a unit decided on but that were **never sent
to the broker**. Each row is mark-to-market evaluated against its signal price;
nothing here is a fill. It is the order half of the shadow ledger pair; the
reasoning half is [thoughts_shadow](thoughts-shadow.md), written in the same
call with the same `thought_id`.

# Producers

| `trade_mode` | Producer (magi-core) | When |
|---|---|---|
| `SHADOW` | `src/llm.js` `place_order` under `TRADE_MODE=SHADOW` (row built by `lib/shadow-trade.js` `buildShadowDecisionRows`) | A SHADOW unit calls `place_order` for `BUY`/`SELL` with `qty > 0`. `HOLD` is never written here — it stays a `thoughts` row (see [MELCHIOR-1 SHADOW write paths](/system/plm-units/melchior-1.md#shadow-write-paths)). |
| `L6_OBSERVE` | `src/llm.js` `recordL6ShadowCandidate` | An `EXTREME_FEAR` BUY that legacy [L6](/system/guards/l6.md) blocked but the new policy would allow or clamp; only the new-exposure leg is recorded. |
| `NORMAL` (legacy) | retired LILITH canary | 27 rows, 2026-07-22 → 2026-07-28; no current producer. |

Both live producers skip the row when the signal price or `thought_id` is
unavailable, and write `trades_shadow` and `thoughts_shadow` together; a
partial insert is logged as a failure.

# Observed contents

As of 2026-11-07: CASPER `SHADOW` 211 rows (2026-08-24 → 2026-09-21, before
its return to LIVE on 2026-09-22), MELCHIOR-1 `SHADOW` 3 rows
(2026-09-14 → 2026-11-05), QWEN `L6_OBSERVE` 1 row (2026-11-05), legacy
LILITH 27 rows. Every row from 2026-09-01 onward joins to a
[thoughts](thoughts.md) row by `thought_id`.

# Schema

Live DDL, 2026-11-07. Same leading columns as [trades](trades.md), without
the later attribution columns (`id`, `price_confirmed`, `entry_price`,
`requested_qty`, `warn_only_layers`, `model_version`).

| Column | Type | Description |
|---|---|---|
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| timestamp | TIMESTAMP | Decision time (UTC). |
| order_id | STRING | Synthetic id: `shadow-<thought_id>` (`SHADOW`) or `l6-observe-<thought_id>-<8 hex>` (`L6_OBSERVE`). MERGE key of the evaluator. Never a broker order id. |
| symbol | STRING | Ticker. |
| side | STRING | `buy` / `sell`. |
| qty | FLOAT64 | Decided quantity (`L6_OBSERVE`: new-exposure leg only). |
| price | FLOAT64 | Signal price (broker quote at decision time); same as `signal_price`. |
| reason | STRING | Order reason (≤ 512 chars). |
| trade_mode | STRING | `SHADOW` / `L6_OBSERVE`; `NORMAL` on legacy LILITH rows. |
| llm_provider | STRING | Provider key. |
| unit_name | STRING | MAGI unit name. |
| result | STRING | NULL until evaluated, then `WIN` / `LOSE` / `HOLD` (see *Evaluation*). |
| exit_price | FLOAT64 | Mark price at the latest evaluation. |
| exit_timestamp | TIMESTAMP | Latest evaluation time. |
| pnl_amount | FLOAT64 | Virtual P&L at `exit_price`. |
| pnl_percent | FLOAT64 | Virtual P&L %, side-adjusted. |
| evaluation_date | DATE | Latest evaluation date (America/New_York). |
| prompt_version | STRING | Prompt version at decision. |
| atr_at_execution | FLOAT64 | Not written by the current producers. |
| market_snapshot | JSON | Not written by the current producers. |
| thought_id | STRING | Join key → [thoughts](thoughts.md) (the analysis row) and [thoughts_shadow](thoughts-shadow.md). |
| signal_price | FLOAT64 | Entry price used by the evaluator. |
| slippage_bps | FLOAT64 | Not written by the current producers. |
| time_to_fill_ms | INT64 | Not written by the current producers. |
| order_attempts | INT64 | Not written by the current producers. |
| broker | STRING | Always `shadow`. |

# Evaluation

`magi-shadow-evaluator` (`shadow-evaluator.mjs`; schedule in
[magi-core operational jobs](/system/services/magi-core.md#operational-jobs))
picks rows older than `SHADOW_MIN_AGE_HOURS` (default 24) with `result` NULL or
`HOLD`, marks them to the current broker quote and MERGEs by `order_id`:
`WIN` at ≥ +2%, `LOSE` at ≤ −2%, otherwise `HOLD`; after `SHADOW_MAX_AGE_DAYS`
(default 14) a `HOLD` resolves by P&L sign. There is no close-event or FIFO
logic — the outcome is a single mark-to-market.

# Consumers

* `magi-shadow-evaluator` (above).
* `scripts/l6-observe-review.mjs` — reviews `L6_OBSERVE` counterfactuals
  (see [L6](/system/guards/l6.md)).

Live-performance aggregates (`trades`, `trades_active`) never include these
rows; virtual outcomes must not be mixed with broker-confirmed results.

# Citations

* `magi-core/src/llm.js` (SHADOW `place_order`; `recordL6ShadowCandidate`).
* `magi-core/lib/shadow-trade.js` (`buildShadowDecisionRows`).
* `magi-core/shadow-evaluator.mjs`.
* Live DDL: `INFORMATION_SCHEMA.TABLES.ddl` for `magi_core.trades_shadow`, read 2026-11-07.
