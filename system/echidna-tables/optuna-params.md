---
type: BigQuery Table
title: optuna_params
description: Optuna-tuned runtime parameters (budget weights, thresholds) with provenance.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=optuna_params&page=table
lilith_safe: false
status: stable
generated: { by: devin/local, at: 2026-10-02T11:30:00Z }
verified: [{ by: human:jun, at: 2026-06-19T01:02:48Z }, { by: human:jun, at: 2026-10-06T05:36:00Z }]
stale_after: 2026-12-16T01:02:48Z
tags: [echidna, bigquery, optuna, tuning, params]
dataset: magi_core
table_type: BASE TABLE
---

Key/value store of Optuna-optimized runtime parameters (e.g. per-provider budget
weights, guard thresholds) with the trial provenance behind each value.

> **Writer frozen 2026-10-02.** Re-optimization is suspended (Jun decision,
> Issue #99 Fable review item D): `magi-optuna-job` runs with
> `OPTUNA_FREEZE=true` and the weekly `magi-optuna-optimizer` scheduler is
> paused. Rows are no longer overwritten; the last written values remain in
> effect for `lib/optuna.js` / `loadBudgetWeights()`. `updated_at` will stop
> advancing — that is expected, not staleness.

# Schema

| Column | Type | Description |
|---|---|---|
| param_name | STRING | Parameter key. |
| param_value | FLOAT64 | Tuned value. |
| param_type | STRING | Value category. |
| updated_at | STRING | Last update. |
| n_trials | INT64 | Trials in the study. |
| trial_count | INT64 | Trials contributing to this value. |
| best_score | FLOAT64 | Best objective score. |
| source | STRING | Study / source id. |
| excluded_symbols | STRING | Symbols excluded from the study. |

# Joins

* `param_name` like `budget_weight_*` → [plm-units](/system/plm-units/) budget weights.

# Citations

* Consumer: `magi-core/lib/config.js` budget weighting; guard thresholds.
