---
type: BigQuery Table
title: optuna_params
description: Optuna-tuned runtime parameters (budget weights, thresholds) with provenance.
resource: https://console.cloud.google.com/bigquery?p=screen-share-459802&d=magi_core&t=optuna_params&page=table
lilith_safe: false
tags: [echidna, bigquery, optuna, tuning, params]
dataset: magi_core
table_type: BASE TABLE
---

Key/value store of Optuna-optimized runtime parameters (e.g. per-provider budget
weights, guard thresholds) with the trial provenance behind each value.

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
