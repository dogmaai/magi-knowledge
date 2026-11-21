---
type: BigQuery Table
title: thought_outcome_feedback
description: TOA/TOF per-provider thought→outcome feedback (90d) — pre-rendered PLM prompt block, confidence bands, trend; source of the "[TOA]" Discord notification.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=thought_outcome_feedback&page=table
lilith_safe: false
status: draft
generated: { by: claude/opus-5-5, at: 2026-11-21T04:25:00Z }
tags: [echidna, bigquery, toa, tof, feedback, calibration]
dataset: magi_core
table_type: BASE TABLE
---

Output of the **Thought-Outcome Analyzer** (`thought-outcome-analyzer.js`,
Cloud Run job `magi-thought-outcome-analyzer`, Scheduler
`magi-thought-outcome-analyzer-daily`, `0 23 * * 1-5` America/New_York — after
[DAPHNE](daphne-feedback.md) at 22:00 ET). It joins
[thoughts](thoughts.md) to [trades](trades.md) on `thought_id`, computes
per-provider metrics, and appends one row per provider per run. The runtime
loader `lib/thought-feedback.js` reads the latest row and injects its
`feedback_text` into the PLM prompt.

> **Draft.** Written by claude/cloud from magi-core `4605ae4` source. Schema,
> row counts and one `feedback_text` row were checked against the live table on
> 2026-11-21 (output relayed by Jun from a session with BigQuery access; see
> *Live check* below). Not human-verified.

# Naming: TOA vs TOF

Both names refer to this one loop. **TOA** (Thought-Outcome *Analyzer*) is the
batch job's log/notification prefix (`[TOA] ...`). **TOF** (Thought-Outcome
*Feedback*) is the runtime loader's log prefix (`[TOF] ...`) and the name used
in `docs/feedback-loops.md`, the A/B holdout description and
[confidence-calibration](/system/constitution/confidence-calibration.md).

# Pipeline

1. **Input.** `thoughts ⨝ trades ON thought_id` where `trades.result IN
   ('WIN','LOSE')`, `LENGTH(thoughts.reasoning) > 10`, and `trades.timestamp`
   is within the last **90 days**. It reads raw `trades`, not
   [`trades_active`](views.md); the positive `result` match already excludes
   `CONTAMINATED`, open (`NULL`/`HOLD`), `FLAT`, close-event and `CANCELLED`
   rows (see [Result vocabulary](trades.md#result-vocabulary)). **`FLAT`
   outcomes are not counted**, so the win rate is WIN/(WIN+LOSE), not over
   all terminal entries. SHADOW decisions go to `trades_shadow`, not
   `trades`, so SHADOW units ([MELCHIOR-1](/system/plm-units/melchior-1.md))
   produce no pairs here.
2. **Grouping.** By `thoughts.llm_provider`. The displayed unit name is the
   `unit_name` of the provider's **most recent** pair (rows are ordered by
   `trades.timestamp DESC`), falling back to `getUnitName(provider)`.
3. **Minimum sample.** A provider is skipped (no row, no notification line) when
   pairs `< getFeedbackMin(provider).resolved` — default 5,
   `FEEDBACK_COLD_START_MIN.openai = 1` (see
   [PROMETHEUS](/system/plm-units/prometheus.md#feedback-cold-start)). The
   `loses` minimum in the same config is **not** checked by this job.
4. **Outputs.** One `thought_outcome_feedback` row per provider (below);
   best-effort rows in `pattern_discovery_kpi` (Brier score, calibration
   error, high-confidence ratio, expectancy, 7d/30d win rate, A/B
   injected-vs-holdout win rate, unique-symbol ratio, best regime, and
   `daphne_fixable_loss_pct` from `daphne_feedback`); a notification in
   category `ANALYSIS`, sent through `lib/telegram.js` — a legacy name: since
   the 2026-11-08 cutover it delivers to **Discord** only (see
   [discord-migration](/system/services/discord-migration.md)); `<b>` tags are
   stripped by `lib/discord.js`.
5. **Injection.** `lib/thought-feedback.js` loads the latest row for the
   session's provider and returns `feedback_text` unless `total_resolved` is
   below the same minimum or the row is older than **7 days**. Sessions in the
   `HOLDOUT` arm of `lib/feedback-holdout.js` (`FEEDBACK_HOLDOUT_PCT`, default
   20) skip the block; the arm is recorded in
   [`thoughts.feedback_injected`](thoughts.md).

# Schema

Matches the writer's insert payload and the live table (`bq show`,
2026-11-21): BASE TABLE, all columns NULLABLE, no column descriptions, no
partitioning or clustering, 751 rows. No DDL file exists in magi-core.

| Column | Type | Description |
|---|---|---|
| analyzed_at | TIMESTAMP | Run time (same for all rows of one run). |
| llm_provider | STRING | Provider key (`qwen`, `kimi`, `openai`, ...). Loader filter key. |
| unit_name | STRING | Unit name of the provider's most recent pair. |
| total_resolved | INTEGER | WIN+LOSE pairs in the 90-day window. |
| win_count | INTEGER | WIN pairs. |
| lose_count | INTEGER | LOSE pairs. |
| win_rate | INTEGER | Rounded % (0–100), i.e. `Math.round(wins*100/total)`. |
| confidence_bands | STRING (JSON text) | `[{band, win_rate, wins, loses, total}]` for bands `0.90+`, `0.80-0.89`, `0.70-0.79`, `0.60-0.69`, `<0.60`; empty bands omitted. |
| regime_breakdown | STRING (JSON text) | Win rate by `thoughts.vix_regime` (groups with n ≥ 3). |
| symbol_breakdown | STRING (JSON text) | `{top, worst}` — up to 5 symbols each, n ≥ 3. |
| direction_breakdown | STRING (JSON text) | Win rate by `trades.side`. |
| reasoning_stats | STRING (JSON text) | Average reasoning length for WIN vs LOSE. |
| trend_7d | STRING (JSON text) | `{wr_7d, count_7d, wr_30d, count_30d, delta}`; `delta = wr_7d − wr_30d` in pp. |
| feedback_text | STRING | Pre-rendered `[THOUGHT-OUTCOME FEEDBACK — <unit>]` prompt block. |

# Reading the "[TOA] Thought-Outcome Feedback Updated" Discord message

Per provider: `<UNIT>: <win_rate>% (<W>W/<L>L)` over **90 days**, then:

* **Best conf band** — the band with the highest win rate among bands with
  n ≥ 3, **except** that the reduction starts from the first listed band
  (normally `0.90+`) without checking its n. A band with n < 3 can therefore
  be shown as "best". The message prints no n.
* **Trend** — `wr_7d − wr_30d` in pp, printed when |delta| > 5. The notification
  line has **no minimum 7-day sample** (the prompt text requires
  `count_7d ≥ 3` before it prints a TREND line), so one or two recent trades
  can produce a large swing.
* A provider missing from the message had fewer pairs than its minimum (or
  has no LIVE `trades` rows at all).
* Retired units keep appearing until their last trade leaves the 90-day
  window; their rows are written but have no consumer, because the unit's
  job no longer runs.

# Known gaps / drift (open, not resolved)

* **Cohorts.** Grouping is by `llm_provider` only. The draft
  [model-cohorting](/system/constitution/model-cohorting.md) rule keys
  aggregates on `(unit_name, model_version)`. Providers that changed unit or
  model within 90 days (e.g. `ollama`: ADAM → BOREAS) are blended under the
  most recent unit name.
* **Small-sample `← STRONG` label (confirmed live).** In
  `generateFeedbackText()` a band is labelled `← STRONG` at `win_rate >= 65`
  with **no sample minimum**, while `← WEAK` requires `total >= 5`. With the
  `openai` cold-start minimum of 1, the PROMETHEUS row of 2026-11-21T04:00:11Z
  injects `0.70-0.79: 100% actual (1W/0L, n=1) ← STRONG`. Whether to add an
  n-floor to STRONG (or raise the `openai` minimum) is Jun's decision.
* **`pattern_discovery_kpi`** has no concept doc yet (listed as pending in
  the [table index](index.md)).
* **Orphan lineage (minor).** 7 trades in the 90-day window carry a
  `thought_id` with no matching `thoughts` row; they drop out of the inner
  join.

# Live check (2026-11-21, 90-day window, raw `trades`)

| llm_provider | unit_name | trades | joined | WIN/LOSE |
|---|---|---|---|---|
| mistral | SOPHIA-5 (retired) | 429 | 429 | 138 |
| qwen | QWEN | 174 | 174 | 40 |
| *(null)* | — | 43 | 0 | 0 |
| kimi | TYPHON | 38 | 38 | 8 |
| ollama | BOREAS | 18 | 18 | 1 |
| ollama | ADAM (retired) | 9 | 9 | 1 |
| deepseek | CASPER | 11 | 11 | 1 |
| openai | PROMETHEUS | 10 | 10 | 1 |
| system | (various) | 20 | 20 | 0 |

The WIN/LOSE counts match the 2026-11-21 Discord notification (SOPHIA-5 93W/45L,
QWEN 23W/17L, TYPHON 2W/6L, PROMETHEUS 1W/0L). CASPER and BOREAS (with ADAM,
`ollama` = 2) are absent because they are under the minimum of 5 resolved
pairs — **not** a join defect (joined = trades). `llm_provider='system'` rows
are `AUTO_CLOSE` events and never reach WIN/LOSE. The 43 unjoined rows are 36
with `thought_id IS NULL` (28 `CONTAMINATED`, 8 `RECON_BASELINE`, 5
`AUTO_CLOSE`/`CLOSE`/`CANCELLED`) and 7 orphans. Result breakdown per unit (raw `trades`, 90 days, same day):

| result | BOREAS | CASPER | QWEN | TYPHON |
|---|---|---|---|---|
| WIN / LOSE | 1 / 0 | 1 / 0 | 23 / 17 | 2 / 6 |
| FLAT | 4 | 1 | 23 | 2 |
| HOLD / null | 0 | 0 | 13 | 1 |
| CANCELLED | 1 | 0 | 7 | 0 |
| CONTAMINATED | 5 | 3 | 64 | 23 |
| close events (CLOSE / AUTO_CLOSE / ORPHAN_CLOSE) | 8 | 9 | 40 | 4 |

So CASPER and BOREAS are absent because they had very few genuine filled
entries (CASPER: 2 terminal entries in 90 days), not because outcomes are
pending. `FLAT` is a large share of terminal outcomes (QWEN 23 FLAT vs 40
WIN/LOSE) and is invisible to this feedback by design. The high
`CONTAMINATED` share (TYPHON 23/38, QWEN 64/187) is a `trades` lineage
matter, excluded here by the positive `result` match. All 425 `CONTAMINATED`
rows in the window fall between 2026-08-24T13:51Z and 2026-10-05T14:31Z,
with none after 2026-10-05; the timing coincides with the 2026-10-03..05
`RECON_BASELINE` seeding / ghost-fill quarantine in [trades](trades.md), but
causation is not verified. Rows before the window start were not checked.

# Citations

* magi-core `4605ae4`: `thought-outcome-analyzer.js`, `lib/thought-feedback.js`,
  `lib/feedback-holdout.js`, `lib/config.js` (`getFeedbackMin`,
  `FEEDBACK_COLD_START_MIN`), `.github/workflows/deploy.yml`
  (job + scheduler), `docs/feedback-loops.md`.
