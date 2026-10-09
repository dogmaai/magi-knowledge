# ECHIDNA — `magi_core` data catalog

ECHIDNA is MAGI's BigQuery data warehouse: project `screen-share-459802`,
dataset `magi_core`, location `US`. The core-table schemas were pulled live
from `INFORMATION_SCHEMA` on 2026-06-19; tables added since carry their own
per-document provenance (live `bq show` captures dated 2026-09-16 where
noted; the remaining code-derived schemas were live-verified via `bq show`
on 2026-10-06) — the per-doc frontmatter and schema notes are authoritative
over this blanket statement.

Two write-path conventions matter:

* **Live tables**: `trades` and `thoughts` are the base tables written by the
  trade loop (`lib/bigquery.js` → `safeInsert` / `batchInsert`).
* **`_active` views**: `trades_active` and `thoughts_active` are VIEWs over the
  base tables (current/active filter). Most read paths — including
  ISABEL stats and the LILITH training extracts — query the views.

# Core trading tables

* [trades](trades.md) - Primary trade log (entry/exit, PnL, attribution).
* [trades-quarantine](trades-quarantine.md) - Original snapshots of `CONTAMINATED` trades rows.
* [trades-price-corrections](trades-price-corrections.md) - Pre-correction snapshots of quote-price fixes.
* [trades-unverifiable](trades-unverifiable.md) - Rows that can never be broker-verified (Alpaca gone / >90d moomoo).
* [thoughts](thoughts.md) - LLM reasoning log (one row per decision).
* [sessions](sessions.md) - Per-session run summary (equity, PnL).
* [views](views.md) - `trades_active` / `thoughts_active` VIEW definitions.

# Intelligence & analysis

* [market-research](market-research.md) - HERMES/ARIEL research cache.
* [pre-trade-intelligence](pre-trade-intelligence.md) - HERMES:BRAVE per-symbol Brave/Gemini sentiment + key events.
* [moomoo-snapshots](moomoo-snapshots.md) - HERMES:MOOMOO broker real-time market snapshots.
* [focus-symbols](focus-symbols.md) - ISABEL daily focus list; the dynamic HERMES collection universe.
* [consensus-signals](consensus-signals.md) - Cross-unit consensus detector.
* [isabel-patterns](isabel-patterns.md) - ISABEL per-provider win/lose keyword patterns (`isabel_l4_patterns`).
* `thought_quality_scores` (deprecated 2026-09-17) - Per-thought quality scoring; documented table never existed — producer actually wrote `fugu_thought_quality_scores` / `thought_quality_rankings` (retired; both dropped 2026-09-23).
* [gemini-pattern-analysis](gemini-pattern-analysis.md) - Periodic Gemini *generic* win/lose pattern report (not causal analysis).
* `fugu_sequential_patterns` (deprecated 2026-09-17) - SEKHMET/`fugu-ultra` sequential **causal** outcome analysis; last row 2026-09-01, producer retired; table dropped 2026-09-23.
* `sekhmet_reviews` (deprecated 2026-09-17) - SHADOW-only hard-case review ledger; created 2026-09-08, never received a row before the producer was retired; dropped 2026-09-23.
* [daphne-feedback](daphne-feedback.md) - DAPHNE LP-taxonomy loss classification with a static causal flag (SQL-based).

# Ops, config & governance

* [llm-metrics](llm-metrics.md) - Per-call token / latency / cost telemetry.
* [hermes-collection-runs](hermes-collection-runs.md) - Per-run HERMES collection outcomes (ok/degraded/error + counters); the dashboard up/down and error-rate signal.
* [llm-config](llm-config.md) - Provider/model registry (cost, status).
* [optuna-params](optuna-params.md) - Optuna-tuned runtime parameters.
* [service-endpoints](service-endpoints.md) - Dynamic service discovery URLs.
* [order-approvals](order-approvals.md) - Single-use approval tokens for the magi-moomoo order gate.
* [system-control](system-control.md) - Global emergency kill-switch state read by L0 and the magi-moomoo order gate.
* [order-intents](order-intents.md) - Append-only order-intent journal; broker-response-loss recovery via remark-embedded intent ids (R10).
* `l4_probation` (deprecated 2026-10-06) - designed Guard L4 blocked-combo state; never materialized in `magi_core` — L4 runs warn-only from the ISABEL stats cache.
* [lilith-hard-gate-events](lilith-hard-gate-events.md) - LILITH VIX hard-gate rewrites (deprecated 2026-09-23; table dropped — sibling ledgers `lilith_confidence_gate_events` / `lilith_forecast_gate_events` dropped in the same action).
* [constitution](constitution.md) - Versioned MAGI Constitution store.

# Experience-distillation corpus (proposed — drafts, tables not yet created)

Three-layer model-independent learning dataset for the ARC×SIG
consolidation path (see the *Learning dataset* section of
[model-consolidation](/system/constitution/model-consolidation.md); DDL in
`magi-core` `sql/`, applied by Jun; no producers wired yet):

* **L0 raw evidence** (append-only; written by live paths under separate review):
  [decision-sources](decision-sources.md) (decision-time context lineage,
  bodies in GCS), [arbiter-verdicts](arbiter-verdicts.md) (Firestore verdict
  mirror incl. NOT_ADOPTED), [order-fills](order-fills.md) (fill-granularity
  increments — partial fills / multi-leg exits).
* **L1 normalized records** (offline extractor only):
  [distill-decisions](distill-decisions.md) (5-element cohort identity,
  `decision_id` issued even for CALL_FAILED),
  [distill-outcomes](distill-outcomes.md) (realized / 10d mark-to-market /
  virtual kept distinct), [distill-bundles](distill-bundles.md) (frozen,
  input-pinned evaluation snapshots).
* **L2 distilled product** (option-A ledger):
  [method-cards](method-cards.md) (model-agnostic cards),
  [method-card-approvals](method-card-approvals.md) (append-only human
  approval binding content hash / selector / scope / combination).

Cross-layer integrity is hash-pinned end to end: L1 rows are a
deterministic function of L0 inputs + `extractor_version`; a frozen
bundle pins each input's `{id, record_version, record_hash}` in
`input_manifest`; a card binds the source bundle's `manifest_hash`. Two
hash domains exist and must not be conflated: structured identity hashes
(`record_hash`, `content_hash`, `manifest_hash`, `scope_hash`,
`cohort_id`, `execution_config_hash`) are SHA-256 over **canonical JSON**
(codepoint-sorted keys — `lib/method-card.js` `canonicalJson`/
`contentHash`), while payload hashes (`body_sha256`, `context_sha256`)
are SHA-256 over the **raw stored bytes** — re-serializing a body as
canonical JSON will never match. Verification re-runs a bundle's frozen
selection (cohort + eval period + `extracted_at ≤ ingest_cutoff` → max
`record_version` → validate) against the current input rows and compares
the whole set to `input_manifest` — any difference means inputs changed
post-freeze and produces a *new* bundle, never an in-place edit. Same
key + same max `record_version` + different `record_hash` is a conflict:
every row for that key is quarantined and reported, never resolved by
arrival order.

# Live tables not yet catalogued (open drift backlog)

Present in `magi_core` (`bq ls` @ 2026-10-06, magi-core `baa5388`) but without a
per-table concept doc. Per COLLABORATION.md every MAGI-referenced table needs a
concept doc here, so each entry below is **tracked drift, not resolved** —
per-table docs are pending work, not waived:
`bq_write_failures`, `chat_log`, `daphne_hint_effectiveness`,
`daphne_loss_analysis`, `isabel_briefings`, `isabel_daily_cache`,
`isabel_requests`, `lilith_training_examples`, `llm_health_checks`,
`manual_focus_symbols`, `model_training_log`, `pattern_discovery_kpi`,
`portfolio_snapshots`, `stale_phrases`, `thought_analysis_findings`,
`thought_embeddings`, `thought_outcome_feedback`, `thoughts_for_ds`,
`thoughts_shadow`, `thoughts_simulation`, `trades_for_ds`, plus views
`isabel_trade_analysis`, `market_research_view`, `symbol_change_rates`,
`trade_results`.
