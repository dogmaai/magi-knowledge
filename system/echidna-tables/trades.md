---
type: BigQuery Table
title: trades
description: Primary trade log — entry/exit, PnL, and unit attribution for every order.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=trades&page=table
lilith_safe: false
tags: [echidna, bigquery, trades, core]
dataset: magi_core
table_type: BASE TABLE
---

`trades` is the system of record for executed orders. The
[`trades_active`](views.md) VIEW filters this table and is what most read paths
(ISABEL stats, LILITH training extracts) query.

# Schema

| Column | Type | Description |
|---|---|---|
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| timestamp | TIMESTAMP | Order time (UTC). |
| order_id | STRING | Broker order id. |
| symbol | STRING | Ticker. |
| side | STRING | `buy` / `sell`. |
| qty | FLOAT64 | Filled quantity. |
| price | FLOAT64 | Fill price. |
| reason | STRING | Short rationale string. |
| trade_mode | STRING | `live` / `paper` / `simulation`. |
| llm_provider | STRING | Provider key (see [plm-units](/system/plm-units/)). |
| unit_name | STRING | MAGI unit name (e.g. `MELCHIOR-1`). |
| result | STRING | `WIN` / `LOSE` / null (open). |
| exit_price | FLOAT64 | Exit fill price. |
| exit_timestamp | TIMESTAMP | Exit time. |
| pnl_amount | FLOAT64 | Realized PnL ($). |
| pnl_percent | FLOAT64 | Realized PnL (%). |
| evaluation_date | DATE | Date result was evaluated. |
| prompt_version | STRING | Constitution / prompt version tag. |
| atr_at_execution | FLOAT64 | ATR-14 at entry. |
| market_snapshot | JSON | Market context blob at entry. |
| thought_id | STRING | FK → [thoughts](thoughts.md).thought_id. |
| signal_price | FLOAT64 | Price when signal fired (pre-slippage). |
| slippage_bps | FLOAT64 | Slippage (basis points). |
| time_to_fill_ms | INT64 | Latency signal→fill. |
| order_attempts | INT64 | Order submission attempts. |
| broker | STRING | Executing broker (e.g. `alpaca`, `moomoo`). |
| price_confirmed | BOOL | Whether fill price was confirmed. |
| entry_price | FLOAT64 | Canonical entry price. |

# Joins

* `session_id` → [sessions](sessions.md).session_id
* `thought_id` → [thoughts](thoughts.md).thought_id
* `llm_provider` / `unit_name` → [plm-units](/system/plm-units/)

# Examples

30-day win-rate per symbol/side for one unit (the shape ISABEL stats build on —
note this is cross-unit-capable and therefore **system-only**):

```sql
SELECT symbol, side,
       COUNTIF(result='WIN')  AS wins,
       COUNTIF(result='LOSE') AS loses,
       SAFE_DIVIDE(COUNTIF(result='WIN'), COUNTIF(result IN ('WIN','LOSE'))) * 100 AS win_rate_pct
FROM `screen-share-459802.magi_core.trades_active`
WHERE unit_name = @unit
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY symbol, side
HAVING COUNTIF(result IN ('WIN','LOSE')) > 0
ORDER BY win_rate_pct DESC;
```

# Citations

* Writer: `validateTradeRow()` / `safeInsert('trades', ...)` in `magi-core/lib/bigquery.js`.
* Consumer (LILITH training): `trades_active` is read by `lilith-training/scripts/extract_hallucination_negatives.py`.
