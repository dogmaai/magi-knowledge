# PLM unit registry

The MAGI PLM units (the LLM roster). Each unit is a provider/model with a
persona, a budget weight, and a lifecycle status. The authoritative runtime
mapping is `getUnitName()` / `getLLMModel()` / `BUDGET_WEIGHTS` in
`magi-core/lib/config.js`; this registry mirrors it for cross-agent reference.
For hosted units, the Model column is the configured API request ID; a
provider may serve a newer model behind an unchanged alias. See
[CASPER](casper.md#provider-model-lifecycle) for the move from the retired
`deepseek-v4-flash` alias to `deepseek-flash` (magi-core#706, 2026-11-07).

This whole tree is **cross-unit by definition** and therefore
`lilith_safe: false`. The LILITH training pipeline must never read it.

# Active units

| Unit | Provider | Model | Budget (NORMAL) | Cloud Run job | Status | Persona |
|---|---|---|---|---|---|---|
| [MELCHIOR-1](melchior-1.md) | google | gemini-3.8-flash | 0.954 | `magi-core-gemini` | shadow (`TRADE_MODE=SHADOW`) | Systematic multi-factor analyst |
| [CASPER](casper.md) | deepseek | deepseek-flash | 0.999 | `magi-core-deepseek` | active | Aggressive momentum hunter |
| [QWEN](qwen.md) | qwen | qwen-plus | 0.5 base / 0.75 effective | `magi-core-qwen` | active | Independent systematic reasoner |
| [TYPHON](typhon.md) | kimi | kimi-k2.6 | 0.5 base / 0.75 effective | `magi-core-kimi` | active | Contrarian deep-value analyst |
| [ADAM](adam.md) | ollama | qwen2.5:7b | 1.0 | `magi-core-adam` | active | Collaborative analyst |
| [PROMETHEUS](prometheus.md) | openai | gpt-5.6-luna | 0.5 | `magi-core-openai` | active | Probability-calibrated strategist |
| [BOREAS](boreas.md) | ollama | ministral-3:8b-ctx32k | 1.0 | `magi-core-boreas` | active | Collaborative analyst (local Mistral family on TIALA) |

`budget_weight_normal` mirrors the base `BUDGET_WEIGHTS` runtime mapping. The
`qwen_NORMAL` (QWEN) and `kimi_NORMAL` (TYPHON) providers receive a
`UNIT_WEIGHT_MULTIPLIERS` 1.5x boost, giving them an *effective* budget weight
of `0.75` at runtime. MELCHIOR-1 is in `TRADE_MODE=SHADOW`: it continues
generating decisions but does not submit live broker orders. Its analysis
rows go to `thoughts` with `trade_mode='SHADOW'`; only its `place_order`
decisions go to `trades_shadow` / `thoughts_shadow` (see
[SHADOW write paths](melchior-1.md#shadow-write-paths)). CASPER was promoted back to LIVE on
2026-09-22.

TIARA remains documented as the legacy VIX-only Ollama identity; see
[TIARA](tiara.md). The `magi-vix-oracle` job (`MODE=VIX_ONLY`, Ollama
`qwen3.5:9b`) was retired on 2026-09-25; daily VIX/sVIX aggregation is now
deterministic inside `magi-isabel-cache` — see
[ORACLE](oracle.md#oracle-vix-specialist-retired-2026-09-25).

## Model changes and cohort identity

A `model` change on an active unit is a **cohort boundary**: statistics do
not carry over to the new model. See the draft
[model-cohorting](/system/constitution/model-cohorting.md) rule —
aggregates key on `(unit_name, model_version)`, not `unit_name` alone.
When a unit's model is replaced, the unit doc records the effective date so
cohort boundaries stay reconstructable from history (e.g.
[BOREAS](boreas.md), 2026-10-02).

# Offline analysis units

None currently — the SEKHMET offline analyzer was retired on 2026-09-17 (see
*Deprecated units* below).

# SHADOW extensions

* The SEKHMET Meta Verifier (`sekhmet-meta-verifier.md`, deprecated
  2026-09-17) was a deployed SHADOW extension that reviewed a bounded batch
  of evaluated hard cases and wrote audit-only findings. Its first scheduled
  run exited non-zero and it produced no rows; it was retired before the
  approved four-run evaluation checkpoint.

# Causal analysis ownership

Role boundaries, so the analyzers are not confused with each other:

> **Planned change (Jun 2026-11-09, not implemented):** the generic pattern
> role below and the vacant LLM causal role are to be merged into one Kimi
> K3.1 Pro analyzer — see the draft
> [magi-outcome-analyzer](/system/services/magi-outcome-analyzer.md). Until
> cutover, the table below describes current state.

| Owner | Model / method | Analysis type | Output |
|---|---|---|---|
| ~~SEKHMET~~ (`magi-fugu-analyzer`, retired 2026-09-17) | Sakana `fugu-ultra`, `reasoning_effort=high` | ~~**Causal analysis** — sequential/time-ordered causal outcome reasoning~~ — role retired; no LLM causal owner at present | `fugu_sequential_patterns` (deprecated) |
| [MELCHIOR-1](melchior-1.md) (`magi-gemini-analyzer`) | Gemini (`gemini-3.8-flash`, AI Studio) | **Generic pattern analysis / logical & quantitative analysis** — WIN/LOSE reasoning tendencies. *Not* the causal-analysis owner | [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md) |
| DAPHNE (`magi-daphne-analyzer`) | BigQuery SQL `REGEXP_CONTAINS` + static `IS_CAUSAL` map (Gemini used only for why-lost narrative / hint rewrites) | **Static causal classification** — LOSE trades into the LP taxonomy, causal vs non-causal by rule | [daphne-feedback](/system/echidna-tables/daphne-feedback.md) |

# Deprecated units

| Unit | Provider | Status | Replaced by |
|---|---|---|---|
| [ANIMA](anima.md) | groq | DEPRECATED (#157) | [TYPHON](typhon.md) |
| [ORACLE](oracle.md) | together | DEPRECATED (#139) | — |
| [ZEROEL](zeroel.md) | xai | RETIRED (cost) | — |
| SEKHMET | sakana | RETIRED 2026-09-17 (offline analyzer produced no output for 16d; Meta Verifier first run failed, 0 rows) | — (LLM causal analysis unassigned) |
| [LILITH](lilith.md) | lilith | RETIRED (inference backend decommissioned) | — |
| [SOPHIA-5](sophia-5.md) | mistral | RETIRED 2026-09-22 (hosted Mistral slot moved to local BOREAS; provider defaults + surge primary moved to QWEN) | [BOREAS](boreas.md) |

`DEPRECATED_PROVIDERS = {together, groq, xai, sakana, lilith, mistral}` are excluded from
budget-weight loading so they do not dilute active units' allocation. ZEROEL was
retired because `xai` is in `DEPRECATED_PROVIDERS`; the disabled
`magi-core-xai` PLM job cost approximately $47/month. `sakana` is listed there
because SEKHMET left the live roster; its remaining offline analyzer roles were
retired on 2026-09-17, when the semi-monthly `magi-thought-quality-ranker`
job — Sakana's last consumer — was retired with them. Sakana has no active
consumer in MAGI. `lilith` is listed there because the LILITH canary was paused
and `lilith-inference-svc` was decommissioned; the `magi-core-lilith` job and
`magi-lilith-gate-monitor` were removed from `deploy.yml` (all retired GCP
jobs/schedulers — Sakana/SEKHMET stack, LILITH pair, and `magi-core-job` +
`magi-scheduler-mistral` — were deleted on 2026-09-23, and the retired
BigQuery ledgers were dropped the same day). `mistral` is listed
there because SOPHIA-5 was retired on 2026-09-22 in favor of the self-hosted
BOREAS unit; `magi-core-job` and `magi-scheduler-mistral` were removed from
`deploy.yml`, and `getLLMProvider`/`getUnitName`/`getLLMModel` defaults moved
to `qwen`/`QWEN`/`qwen-plus`.

# Relationship to LILITH (historical)

QWEN is the DashScope `qwen` provider and LILITH was the fine-tuned `lilith`
provider; they were separate unit names and slots. Per the
[clean-source rule](/_lilith_safe/constitution/clean-source-rule.md), LILITH
ignored every other unit in this registry. The `_lilith_safe/` tree remains
frozen as the historical training-data boundary.
