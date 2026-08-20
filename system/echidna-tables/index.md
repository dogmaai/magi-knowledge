# ECHIDNA — `magi_core` data catalog

ECHIDNA is MAGI's BigQuery data warehouse: project `screen-share-459802`,
dataset `magi_core`, location `US`. Schemas below were pulled live from
`INFORMATION_SCHEMA` on 2026-06-19.

Two write-path conventions matter:

* **Live tables**: `trades` and `thoughts` are the base tables written by the
  trade loop (`lib/bigquery.js` → `safeInsert` / `batchInsert`).
* **`_active` views**: `trades_active` and `thoughts_active` are VIEWs over the
  base tables (current/active filter). Most read paths — including
  ISABEL stats and the LILITH training extracts — query the views.

# Core trading tables

* [trades](trades.md) - Primary trade log (entry/exit, PnL, attribution).
* [thoughts](thoughts.md) - LLM reasoning log (one row per decision).
* [sessions](sessions.md) - Per-session run summary (equity, PnL).
* [views](views.md) - `trades_active` / `thoughts_active` VIEW definitions.

# Intelligence & analysis

* [market-research](market-research.md) - HERMES/ARIEL research cache (Deep Research outputs).
* [consensus-signals](consensus-signals.md) - Cross-unit consensus detector.
* [isabel-patterns](isabel-patterns.md) - ISABEL historical win/lose centroids.
* [thought-quality-scores](thought-quality-scores.md) - Per-thought quality scoring.
* [gemini-pattern-analysis](gemini-pattern-analysis.md) - Periodic Gemini *generic* win/lose pattern report (not causal analysis).
* [fugu-sequential-patterns](fugu-sequential-patterns.md) - SEKHMET/`fugu-ultra` sequential **causal** outcome analysis.
* [daphne-feedback](daphne-feedback.md) - DAPHNE LP-taxonomy loss classification with a static causal flag (SQL-based).

# Ops, config & governance

* [llm-metrics](llm-metrics.md) - Per-call token / latency / cost telemetry.
* [llm-config](llm-config.md) - Provider/model registry (cost, status).
* [optuna-params](optuna-params.md) - Optuna-tuned runtime parameters.
* [service-endpoints](service-endpoints.md) - Dynamic service discovery URLs.
* [l4-probation](l4-probation.md) - Guard L4 blocked provider/side combos.
* [lilith-hard-gate-events](lilith-hard-gate-events.md) - LILITH VIX hard-gate rewrites.
* [constitution](constitution.md) - Versioned MAGI Constitution store.
