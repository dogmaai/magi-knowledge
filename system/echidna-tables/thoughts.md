---
type: BigQuery Table
title: thoughts
description: LLM reasoning log — one row per decision, with action, reasoning, and confidence.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=thoughts&page=table
lilith_safe: false
status: draft
generated: { by: claude/opus-5-5, at: 2026-11-07T04:33:35Z }
verified: [{ by: human:jun, at: 2026-10-03T03:25:59Z }, { by: human:jun, at: 2026-10-20T08:44:00Z }]
stale_after: 2027-04-18T08:44:00Z
tags: [echidna, bigquery, thoughts, reasoning, core]
dataset: magi_core
table_type: BASE TABLE
---

> Revision note (2026-11-07): the `trade_mode` value list was corrected to the
> values observed in production and written by magi-core (see the column row
> below). This revision is not yet human-verified, so the doc is `draft`
> until Jun re-verifies it; the retained `verified` entries cover the earlier
> revision.

`thoughts` captures each unit's reasoning for a decision. The
[`thoughts_active`](views.md) VIEW filters it; the LILITH `rejected`-example
miner reads the view.

Guard layers also append audit rows via `logGuardBlock()` — `id` prefixed
`block_`, `action` and `trade_mode` set to `BLOCKED` (`WARN_ONLY` for
warn-only layers), `concerns` carrying the layer id (e.g. `L7`, `JEV`), and
`reasoning` the block reason. These document blocked decisions, not LLM
reasoning. Since magi-core#609 each guard row mints its own corpus
`decision_id` — one thoughts row = one corpus decision. The fresh id is
deliberate: the guard verdict is a distinct decision event, and reusing
the analysis decision_id would collide in the extractor's single-key
dedupe.

Two further producers journal non-LLM decision rows (magi-core#609):

- `AUTO_CLOSE` system closes (`src/positionMgmt.js`) write a row with
  `llm_provider='system'`, `action` = close side (`SELL`/`BUY`),
  `confidence=0` (a system decision carries no model confidence — 0 is
  honest, not fabricated), `concerns='AUTO_CLOSE'`, and the same
  `decision_id` passed to the order dispatch — journaled before the
  broker call. Their `trade_mode` is the caller's: `POSITION_GUARD` when
  `position-guard.mjs` (the `magi-position-guard` job) closes, otherwise the
  trade session's `TRADE_MODE` (`NORMAL` in production).
- LLM calls that fail after the retry loop (provider errors, exhausted
  429 retries) or return an unusable response (no
  `choices[0].message`) write `action='CALL_FAILED'` via
  `lib/call-failed-journal.js`, journaled by `src/session.js` at the
  call site. "Best-effort" means a journaling failure returns
  `ok:false` and never masks the original call failure — the row is
  written whenever BigQuery accepts it, not guaranteed.

Downstream: all three row kinds flow through the L0→L1 extractor like
any `decision_id`-bearing thoughts row — `llm_provider='system'` forms
its own cohort, `CALL_FAILED`/`BLOCKED`/`WARN_ONLY` rows evaluate to
`unevaluable`/`no_trade_row` outcomes (no trade evidence exists),
which is the intended corpus signal.

# Schema

| Column | Type | Description |
|---|---|---|
| session_id | STRING | FK → [sessions](sessions.md).session_id. |
| timestamp | TIMESTAMP | Decision time (UTC). |
| content | STRING | Raw model completion. |
| trade_mode | STRING | The writing job's `TRADE_MODE` — see [trade_mode values](#trade_mode-values). |
| llm_provider | STRING | Provider key; `'system'` on `AUTO_CLOSE` close-decision rows (added 2026-10-11, magi-core#609). |
| unit_name | STRING | MAGI unit name. |
| symbol | STRING | Ticker under consideration. |
| action | STRING | `BUY` / `SELL` / `HOLD`; `BLOCKED` / `WARN_ONLY` on guard-block rows; `CALL_FAILED` on failed/unusable LLM-call rows (added 2026-10-11, magi-core#609). |
| side | STRING | Trade direction (`buy`/`sell`) written by `logGuardBlock` on guard-block rows; NULL elsewhere and for rows predating the column (added 2026-10-02, magi-core#535). |
| reasoning | STRING | Parsed reasoning / thesis. |
| hypothesis | STRING | Stated hypothesis. |
| confidence | FLOAT64 | Self-reported confidence `0.0–1.0`. |
| concerns | STRING | Stated risks/concerns; guard layer id (e.g. `L7`, `JEV`) on guard-block rows. |
| prompt_version | STRING | Constitution / prompt version. |
| thought_id | STRING | PK; FK target for [trades](trades.md).thought_id. |
| decision_id | STRING | Corpus identifier (`d_` + 12 hex) minted at decision time — also present on `HOLD`, `CALL_FAILED` and guard-block rows, not only executed orders; independent of `thought_id`. Anchors the lineage `decision_id → intent_id → broker_order_id → fill_id`. NULL for rows predating the column (added 2026-10-10, magi-core#602). |
| vix_estimate | FLOAT64 | VIX level estimate at decision. |
| vix_regime | STRING | VIX regime label. |
| reasoning_content | STRING | Extended chain-of-thought (when provided). |
| ariel_context_used | BOOL | Whether ARIEL market context was injected. |
| feedback_injected | BOOL | A/B holdout flag: TRUE = feedback injected, FALSE = HOLDOUT arm, NULL = no assignment (added earlier; see `alter_thoughts_add_feedback_injected.sql`). |
| model_version | STRING | Served-model identifier at decision time (e.g. `gemini-3.8-flash`, `ministral-3:8b-ctx32k`); also written on guard-block rows. Cohort key per [model-cohorting](/system/constitution/model-cohorting.md): `cohort = (unit_name, model_version)`. NULL for rows predating the column (added 2026-10-03, magi-core#544). |

# trade_mode values

Full-table read, 2026-11-07 (magi-core `e991ce1db9a0c5043c26d19e0c407da3f6f4420d`):

| Value | Written by | Notes |
|---|---|---|
| `NORMAL` | analysis rows of live units; `AUTO_CLOSE` rows from a trade session | The only value [`thoughts_active`](views.md) keeps. |
| `SHADOW` | analysis rows (`log_analysis`, incl. `HOLD`) of `TRADE_MODE=SHADOW` units | Their `place_order` decisions go to [trades_shadow](trades-shadow.md) / [thoughts_shadow](thoughts-shadow.md), not here. See [MELCHIOR-1 SHADOW write paths](/system/plm-units/melchior-1.md#shadow-write-paths). Since 2026-08-24 (CASPER until 2026-09-21, MELCHIOR-1 since). |
| `POSITION_GUARD` | `AUTO_CLOSE` rows from the `magi-position-guard` job | Since 2026-10-12. |
| `BLOCKED` / `WARN_ONLY` | guard-block rows (`src/guard.js` `logGuardBlock`) | |
| `SCALPING` | retired scalping jobs | Historical only (2026-01-28 → 2026-02-11). |
| NULL | — | 3 legacy rows (2026-02-18). |

The formerly documented `live` / `paper` / `simulation` occur in no row of
the table.

# Joins

* `thought_id` ← [trades](trades.md).thought_id — primary key; subject to the
  attribution-integrity contract below.
* `session_id` → [sessions](sessions.md).session_id
* `thought_id` ← [trades_shadow](trades-shadow.md) / [thoughts_shadow](thoughts-shadow.md).thought_id — a SHADOW unit's order decision reuses the `thought_id` of its `SHADOW` analysis row here.
* `thought_id` → `thought_quality_scores` (deprecated 2026-09-17).thought_id

# Attribution integrity

`thought_id` is the primary join key between thoughts and trades, but the
same id can be reused for a different trade (production has shown e.g. a META
trade joined to an NVDA thought). A pair is a valid learning/reporting sample
only when the surrounding metadata agrees — `symbol`, `llm_provider`,
`session_id` and `trade_mode` must match under `IS NOT DISTINCT FROM`
semantics (NULL vs NULL is consistent; NULL vs a value is a mismatch).
Consumers MUST exclude inconsistent pairs and report exclusion counts; they
must never fall back to `session_id`+`symbol` joins and must not treat
trades with no consistent thought as labelled samples. Enforced in magi-core
by `lib/learning-join.js` (`consistentThoughtJoinOn`) and
`optuna_utils.THOUGHT_JOIN_CONDITION` (magi-core#516).

# Examples

Mine high-confidence directional thoughts on thin data (the
[confidence-override](/_lilith_safe/hallucination-patterns/confidence-override.md)
hallucination shape):

```sql
SELECT thought_id, symbol, action, confidence, reasoning
FROM `screen-share-459802.magi_core.thoughts_active`
WHERE action IN ('BUY','SELL') AND confidence > 0.7
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY);
```

# Citations

* Writer: `validateThoughtRow()` / `safeInsert('thoughts', ...)` in `magi-core/lib/bigquery.js`; analysis rows from `log_analysis` in `magi-core/src/llm.js` (`trade_mode: getTradeMode()`), guard rows from `src/guard.js`, close-decision rows from `src/positionMgmt.js`.
* Consumer (retired): `lilith-training/scripts/extract_hallucination_negatives.py` read `thoughts_active` (pipeline retired 2026-09; repo and jobs deleted 2026-10-07).
