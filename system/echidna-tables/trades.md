---
type: BigQuery Table
title: trades
description: Primary trade log — entry/exit, PnL, and unit attribution for every order.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=trades&page=table
lilith_safe: false
status: draft
generated: { by: devin/cli, at: 2026-10-07T02:15:00Z }
verified: [{ by: human:jun, at: 2026-06-19T01:02:48Z }, { by: human:jun, at: 2026-10-06T05:36:00Z }]
stale_after: 2027-04-04T05:36:00Z
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
| timestamp | TIMESTAMP | Order time (UTC). On `AUTO_CLOSE` rows this is the close-event time. |
| order_id | STRING | Broker order id. |
| symbol | STRING | Ticker. |
| side | STRING | `buy` / `sell`. |
| qty | FLOAT64 | Confirmed filled quantity. Unconfirmed rows (`price_confirmed=FALSE`) may carry `0`; the submitted quantity lives in `requested_qty` until the evaluator reconciles the fill. |
| requested_qty | FLOAT64 | Quantity requested at submission (written on manual/`AUTO_CLOSE` rows). |
| price | FLOAT64 | Fill price. NULL until the fill is confirmed. |
| reason | STRING | Short rationale string (`STOP_LOSS`, `TAKE_PROFIT`, …). |
| trade_mode | STRING | `NORMAL` / `VIX_ONLY` / `SHADOW` / `POSITION_GUARD`. |
| llm_provider | STRING | Provider key (see [plm-units](/system/plm-units/)). |
| unit_name | STRING | MAGI unit name (e.g. `MELCHIOR-1`). On `AUTO_CLOSE` rows this is the *executing* unit; FIFO-owner attribution is applied by the consumer (see [L1.7 daily-loss](/system/guards/l1-7.md)). |
| result | STRING | See [Result vocabulary](#result-vocabulary) below. |
| exit_price | FLOAT64 | Exit fill price. |
| exit_timestamp | TIMESTAMP | For `WIN`/`LOSE` the actual last close-event time; for `AUTO_CLOSE` the row's own timestamp; for `CANCELLED` the evaluation time. NULL while open/`HOLD`. |
| pnl_amount | FLOAT64 | Realized PnL ($) for `WIN`/`LOSE`/`AUTO_CLOSE`; mark-to-market estimate while `HOLD`. |
| pnl_percent | FLOAT64 | Realized PnL (%) for `WIN`/`LOSE`/`AUTO_CLOSE`; mark-to-market while `HOLD`. |
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
| price_confirmed | BOOL | `TRUE` = broker-confirmed fill. `FALSE` = submitted but unconfirmed (pending evaluator reconciliation — `price`/`pnl_*` may be null). `NULL` = legacy row predating the flag. |
| entry_price | FLOAT64 | Canonical entry price. On `AUTO_CLOSE` rows this is the broker position's average entry. |
| warn_only_layers | STRING | Comma-joined ids of opt-in warn-only guards that fired on this order (e.g. `L2`, `L3`, `L3,L2`). `NULL` = none fired / rows predating the column. Exact "would have been blocked" marker for #548 counterfactual measurement — the `WARN_ONLY` thoughts row carries no `thought_id`, so this column is the reliable per-trade link. |
| model_version | STRING | Decision-time served-model identifier for distill-corpus attribution (added 2026-10-10, magi-core#592). `NULL` = unattributable / rows predating the column. |

Counterfactual aggregation note (`warn_only_layers`, magi-core#548): the
exact measurement window is `timestamp >= TIMESTAMP '2026-10-03 10:40:42
UTC'` — column existence verified 10:35:42Z (Cloud Logging audit: writer
code deployed 10:01:02Z, Jun applied the DDL 10:35:13Z), plus one
`SCHEMA_CACHE_TTL_MS` (5 min, `lib/bigquery.js`). A schema cached just
before the DDL would keep reporting the column as absent and drop the field
until its TTL expired, so the verified instant alone is not a sufficient
cutover. Rows before the cutover are *unmeasured*, not "no hit" — exclude
them from both numerator and denominator instead of counting `NULL` as
no-hit.

Denominator (Jun, 2026-10-04): entry-path rows on units where the measured
layer was warn-only-enabled **at trade time** — i.e. the row's `timestamp`
falls inside that layer's enabled window for the row's `unit_name`.

* Entry path is identified by `thought_id IS NOT NULL AND result IS
  DISTINCT FROM 'AUTO_CLOSE'` — the entry writer hard-blocks the insert
  when no `thought_id` is resolvable, and the positionMgmt `AUTO_CLOSE`
  writer never sets one. Rows failing the predicate are *unidentifiable*
  (writer path cannot be determined): excluded from the main rate but
  counted in the reference aggregate, never silently dropped.
* `result = 'CONTAMINATED'` rows are excluded from numerator and
  denominator via a NULL-safe predicate (`result IS DISTINCT FROM
  'CONTAMINATED'` — a bare `!=` comparison would silently drop
  still-open rows where `result IS NULL`); the exclusion count and their
  hit count are reported in a separate reference aggregate.
* Enablement is evaluated per layer at trade time. The current windows —
  L2 and L3 on `TYPHON`, `CASPER`, `PROMETHEUS`, `QWEN`, `ADAM`, `BOREAS`,
  enabled by magi-core#565 (deploy success 2026-10-03T03:45:17Z) — are
  fixed in the canonical query and must be edited on any deploy-config
  change; they must not be extended to other units or periods without a
  matching `*_WARN_ONLY` flag change in `deploy.yml`. Per-layer rates use
  each layer's own enabled window as the denominator.

Canonical query: `sql/measure_warn_only_layers.sql` in magi-core. This
note is authoritative; the query file carries a header pointing back here,
and both sides must be updated in the same change — any divergence is a
drift to report, not to resolve silently.

Between warn-only enablement (magi-core#565, deployed 2026-10-03T03:45:17Z)
and the cutover, would-be blocks exist only as `WARN_ONLY` thoughts rows
carrying no `thought_id`; correlating them to trades is a fuzzy
`unit`/`symbol`/date match that mis-assigns on same-day same-symbol
retries, so keep that gap-band estimate a separate, degraded-confidence
aggregate — never merged into the exact counts. A pre-DDL schema-fetch
failure could also make `tableHasColumn()` return `true` and let the
insert's `ignoreUnknownValues` drop the value silently; post-cutover this
cannot occur (the column exists, so a kept field is written), and the only
window where it could is already inside the excluded zone. Optional
consistency check: flag `trades` rows whose session *and* symbol match a
`WARN_ONLY` thought row but `warn_only_layers IS NULL` (matching both keys
avoids false positives on other same-session trades) — detection only;
flagged rows are candidates for manual inspection, never counts or
learning labels (per the [thoughts](thoughts.md) attribution-integrity
contract).

# Result vocabulary

| result | Meaning |
|---|---|
| *(null)* | Open, not yet evaluated. |
| `HOLD` | Position still open (incl. partially closed). `pnl_*` is mark-to-market telemetry, not realized. |
| `WIN` / `LOSE` | Realized outcome — requires the full entry qty to be covered by FIFO-attributed close events after the entry. |
| `AUTO_CLOSE` | A close *event* row (the exit leg written by positionMgmt), not an entry. Its `pnl_amount`/`pnl_percent` are realized at the row's `timestamp`. |
| `CANCELLED` | Order terminally failed with no fill (broker no-fill status). |
| `CONTAMINATED` | Quarantined fabricated fill — broker history proved the order never filled. Original row preserved in `magi_core.trades_quarantine`. Consumers must exclude it; positive-match filters (`result IN ('WIN','LOSE')` etc.) do so automatically. |

# Related tables

* `magi_core.trades_quarantine` — full snapshot of every row marked `CONTAMINATED`, plus `quarantine_reason` / `quarantine_source` / `quarantined_at`.
* `magi_core.trades_price_corrections` — original values of rows whose `price`/`qty`/`pnl_*` were backfilled with the broker `dealt_avg_price`/`dealt_qty`, plus `corrected_price` / `corrected_qty` / `backed_up_at`.

# Joins

* `session_id` → [sessions](sessions.md).session_id
* `thought_id` → [thoughts](thoughts.md).thought_id — subject to the
  attribution-integrity contract in [thoughts](thoughts.md) (`symbol`,
  `llm_provider`, `session_id`, `trade_mode` must agree; inconsistent pairs
  are excluded and counted, not silently adopted).
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
* Consumer (LILITH training, retired): `trades_active` was read by `lilith-training/scripts/extract_hallucination_negatives.py` (pipeline retired 2026-09; repo and jobs deleted 2026-10-07).
