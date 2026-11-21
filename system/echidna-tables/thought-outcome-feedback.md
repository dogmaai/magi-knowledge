---
type: BigQuery Table
title: thought_outcome_feedback
description: TOA/TOF per-provider thought→outcome feedback (90d) — pre-rendered PLM prompt block, confidence bands, trend; source of the "[TOA]" Telegram summary.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=thought_outcome_feedback&page=table
lilith_safe: false
status: draft
generated: { by: claude/opus-5-5, at: 2026-11-21T04:04:11Z }
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

> **Draft.** Written by claude/cloud from magi-core `4605ae4` source only.
> The BigQuery schema and row contents were **not** checked against the live
> table (no GCP credentials in that session). Not human-verified.

# Naming: TOA vs TOF

Both names refer to this one loop. **TOA** (Thought-Outcome *Analyzer*) is the
batch job's log/Telegram prefix (`[TOA] ...`). **TOF** (Thought-Outcome
*Feedback*) is the runtime loader's log prefix (`[TOF] ...`) and the name used
in `docs/feedback-loops.md`, the A/B holdout description and
[confidence-calibration](/system/constitution/confidence-calibration.md).

# Pipeline

1. **Input.** `thoughts ⨝ trades ON thought_id` where `trades.result IN
   ('WIN','LOSE')`, `LENGTH(thoughts.reasoning) > 10`, and `trades.timestamp`
   is within the last **90 days**. SHADOW decisions go to `trades_shadow`, not
   `trades`, so SHADOW units ([MELCHIOR-1](/system/plm-units/melchior-1.md))
   produce no pairs here.
2. **Grouping.** By `thoughts.llm_provider`. The displayed unit name is the
   `unit_name` of the provider's **most recent** pair (rows are ordered by
   `trades.timestamp DESC`), falling back to `getUnitName(provider)`.
3. **Minimum sample.** A provider is skipped (no row, no Telegram line) when
   pairs `< getFeedbackMin(provider).resolved` — default 5,
   `FEEDBACK_COLD_START_MIN.openai = 1` (see
   [PROMETHEUS](/system/plm-units/prometheus.md#feedback-cold-start)). The
   `loses` minimum in the same config is **not** checked by this job.
4. **Outputs.** One `thought_outcome_feedback` row per provider (below);
   best-effort rows in `pattern_discovery_kpi` (Brier score, calibration
   error, high-confidence ratio, expectancy, 7d/30d win rate, A/B
   injected-vs-holdout win rate, unique-symbol ratio, best regime, and
   `daphne_fixable_loss_pct` from `daphne_feedback`); a Telegram summary in
   category `ANALYSIS`.
5. **Injection.** `lib/thought-feedback.js` loads the latest row for the
   session's provider and returns `feedback_text` unless `total_resolved` is
   below the same minimum or the row is older than **7 days**. Sessions in the
   `HOLDOUT` arm of `lib/feedback-holdout.js` (`FEEDBACK_HOLDOUT_PCT`, default
   20) skip the block; the arm is recorded in
   [`thoughts.feedback_injected`](thoughts.md).

# Schema

Inferred from the writer's insert payload (`table.insert(...,
{ ignoreUnknownValues: true })`); no DDL file exists in magi-core.

| Column | Type (inferred) | Description |
|---|---|---|
| analyzed_at | TIMESTAMP | Run time (same for all rows of one run). |
| llm_provider | STRING | Provider key (`qwen`, `kimi`, `openai`, ...). Loader filter key. |
| unit_name | STRING | Unit name of the provider's most recent pair. |
| total_resolved | INT64 | WIN+LOSE pairs in the 90-day window. |
| win_count | INT64 | WIN pairs. |
| lose_count | INT64 | LOSE pairs. |
| win_rate | INT64 | Rounded % (0–100). |
| confidence_bands | STRING (JSON) | `[{band, win_rate, wins, loses, total}]` for bands `0.90+`, `0.80-0.89`, `0.70-0.79`, `0.60-0.69`, `<0.60`; empty bands omitted. |
| regime_breakdown | STRING (JSON) | Win rate by `thoughts.vix_regime` (groups with n ≥ 3). |
| symbol_breakdown | STRING (JSON) | `{top, worst}` — up to 5 symbols each, n ≥ 3. |
| direction_breakdown | STRING (JSON) | Win rate by `trades.side`. |
| reasoning_stats | STRING (JSON) | Average reasoning length for WIN vs LOSE. |
| trend_7d | STRING (JSON) | `{wr_7d, count_7d, wr_30d, count_30d, delta}`; `delta = wr_7d − wr_30d` in pp. |
| feedback_text | STRING | Pre-rendered `[THOUGHT-OUTCOME FEEDBACK — <unit>]` prompt block. |

# Reading the "[TOA] Thought-Outcome Feedback Updated" Telegram message

Per provider: `<UNIT>: <win_rate>% (<W>W/<L>L)` over **90 days**, then:

* **Best conf band** — the band with the highest win rate among bands with
  n ≥ 3, **except** that the reduction starts from the first listed band
  (normally `0.90+`) without checking its n. A band with n < 3 can therefore
  be shown as "best". The message prints no n.
* **Trend** — `wr_7d − wr_30d` in pp, printed when |delta| > 5. The Telegram
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
* **Small-sample feedback.** With the `openai` cold-start minimum of 1, a
  single trade produces a feedback block that labels its band
  `← STRONG` at 100%.
* **`pattern_discovery_kpi`** has no concept doc yet (listed as pending in
  the [table index](index.md)).
* **Schema** above is inferred from code, not `bq show`.

# Citations

* magi-core `4605ae4`: `thought-outcome-analyzer.js`, `lib/thought-feedback.js`,
  `lib/feedback-holdout.js`, `lib/config.js` (`getFeedbackMin`,
  `FEEDBACK_COLD_START_MIN`), `.github/workflows/deploy.yml`
  (job + scheduler), `docs/feedback-loops.md`.
