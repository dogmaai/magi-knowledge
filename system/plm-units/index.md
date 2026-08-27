# PLM unit registry

The MAGI PLM units (the LLM roster). Each unit is a provider/model with a
persona, a budget weight, and a lifecycle status. The authoritative runtime
mapping is `getUnitName()` / `getLLMModel()` / `BUDGET_WEIGHTS` in
`magi-core/lib/config.js`; this registry mirrors it for cross-agent reference.

This whole tree is **cross-unit by definition** and therefore
`lilith_safe: false`. The LILITH training pipeline must never read it.

# Active units

| Unit | Provider | Model | Budget (NORMAL) | Cloud Run job | Status | Persona |
|---|---|---|---|---|---|---|
| [SOPHIA-5](sophia-5.md) | mistral | mistral-small-2603 | 0.774 | `magi-core-job` | active | Strategist / golden reasoning (default) |
| [MELCHIOR-1](melchior-1.md) | google | gemini-3.7-flash | 0.954 | `magi-core-gemini` | shadow (`TRADE_MODE=SHADOW`) | Systematic multi-factor analyst |
| [CASPER](casper.md) | deepseek | deepseek-v4-flash | 0.999 | `magi-core-deepseek` | shadow (`TRADE_MODE=SHADOW`) | Aggressive momentum hunter |
| [QWEN](qwen.md) | qwen | qwen-plus | 0.5 base / 0.75 effective | `magi-core-qwen` | active | Independent systematic reasoner |
| [LILITH](lilith.md) | lilith | lilith-v1.0-b2-prod | 0.5 | `magi-core-lilith` (canary) | active | Independent fine-tuned reasoner |
| [TYPHON](typhon.md) | kimi | kimi-k2.6 | 0.5 base / 0.75 effective | `magi-core-kimi` | active | Contrarian deep-value analyst |
| [ADAM](adam.md) | ollama | qwen2.5:7b | 1.0 | `magi-core-adam` | active | Collaborative analyst |
| [PROMETHEUS](prometheus.md) | openai | gpt-5.6-luna | 0.5 | `magi-core-openai` | active | Probability-calibrated strategist |

`budget_weight_normal` mirrors the base `BUDGET_WEIGHTS` runtime mapping. The
`qwen_NORMAL` (QWEN) and `kimi_NORMAL` (TYPHON) providers receive a
`UNIT_WEIGHT_MULTIPLIERS` 1.5x boost, giving them an *effective* budget weight
of `0.75` at runtime. CASPER and MELCHIOR-1 are in `TRADE_MODE=SHADOW`: they
continue generating decisions and recording to `trades_shadow` /
`thoughts_shadow`, but do not submit live broker orders. LILITH's canary sets
`LILITH_AUTOTRADE=0`.

TIARA remains documented as the legacy VIX-only Ollama identity; see
[TIARA](tiara.md). The `magi-vix-oracle` job uses the Ollama provider with
`MODE=VIX_ONLY`, rather than occupying a PLM rotation slot.

# Offline analysis units

| Unit | Provider | Model | Role |
|---|---|---|---|
| [SEKHMET](sekhmet.md) | sakana | fugu-ultra | Offline sequential / **causal** outcome analysis (`magi-fugu-analyzer`); retired from the live roster |

# Causal analysis ownership

Role boundaries, so the analyzers are not confused with each other:

| Owner | Model / method | Analysis type | Output |
|---|---|---|---|
| [SEKHMET](sekhmet.md) (`magi-fugu-analyzer`) | Sakana `fugu-ultra`, `reasoning_effort=high` | **Causal analysis** — sequential/time-ordered causal outcome reasoning (`causal_insights`, win/lose streaks, regime transitions) | [fugu-sequential-patterns](/system/echidna-tables/fugu-sequential-patterns.md) |
| [MELCHIOR-1](melchior-1.md) (`magi-gemini-analyzer`) | Gemini (`gemini-3-flash-preview`, Vertex AI) | **Generic pattern analysis / logical & quantitative analysis** — WIN/LOSE reasoning tendencies. *Not* the causal-analysis owner | [gemini-pattern-analysis](/system/echidna-tables/gemini-pattern-analysis.md) |
| DAPHNE (`magi-daphne-analyzer`) | BigQuery SQL `REGEXP_CONTAINS` + static `IS_CAUSAL` map (Gemini used only for why-lost narrative / hint rewrites) | **Static causal classification** — LOSE trades into the LP taxonomy, causal vs non-causal by rule | [daphne-feedback](/system/echidna-tables/daphne-feedback.md) |

# Deprecated units

| Unit | Provider | Status | Replaced by |
|---|---|---|---|
| [ANIMA](anima.md) | groq | DEPRECATED (#157) | [TYPHON](typhon.md) |
| [ORACLE](oracle.md) | together | DEPRECATED (#139) | — |
| [ZEROEL](zeroel.md) | xai | RETIRED (cost) | — |

`DEPRECATED_PROVIDERS = {together, groq, xai, sakana}` are excluded from
budget-weight loading so they do not dilute active units' allocation. ZEROEL was
retired because `xai` is in `DEPRECATED_PROVIDERS`; the disabled
`magi-core-xai` PLM job cost approximately $47/month. `sakana` is listed there
because SEKHMET left the live roster, but it still runs as the offline causal
analyzer above.

# Relationship to LILITH

QWEN is the DashScope `qwen` provider and LILITH is the fine-tuned `lilith`
provider; they are separate unit names and slots. Per the
[clean-source rule](/_lilith_safe/constitution/clean-source-rule.md), LILITH
ignores every other unit in this registry.
