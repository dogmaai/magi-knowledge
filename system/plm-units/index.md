# PLM unit registry

The MAGI PLM units (the LLM roster). Each unit is a provider/model with a
persona, a budget weight, and a lifecycle status. The authoritative runtime
mapping is `getUnitName()` / `getLLMModel()` / `BUDGET_WEIGHTS` in
`magi-core/lib/config.js`; this registry mirrors it for cross-agent reference.

This whole tree is **cross-unit by definition** and therefore
`lilith_safe: false`. The LILITH training pipeline must never read it.

# Active units

| Unit | Provider | Model | Budget (NORMAL) | Persona |
|---|---|---|---|---|
| [SOPHIA-5](sophia-5.md) | mistral | mistral-small-latest | 0.774 | Strategist / golden reasoning (default) |
| [MELCHIOR-1](melchior-1.md) | google | gemini-2.5-flash | 0.954 | Systematic multi-factor analyst |
| [CASPER](casper.md) | deepseek | deepseek-v4-flash | 0.999 | Aggressive momentum hunter |
| [ZEROEL](zeroel.md) | xai | grok-4.3 | 0.5 | Realtime news / X social algo trader |
| [TIARA](tiara.md) | ollama | qwen2.5:14b | 1.0 | Self-hosted local reasoner |
| [LILITH](lilith.md) | qwen / lilith | qwen-plus / lilith-v1.0-b2-prod | 0.5 | Independent reasoner (fine-tuned) |
| [TYPHON](typhon.md) | kimi | kimi-k2.6 | 0.5 | Contrarian deep-value analyst |
| [PROMETHEUS](prometheus.md) | openai | gpt-4o-mini | — (auxiliary) | GPT auxiliary / backup |

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

Deprecated providers (`DEPRECATED_PROVIDERS`, currently `{together, groq, sakana}`)
are excluded from budget-weight loading so they don't dilute active units'
allocation. `sakana` is listed there because SEKHMET left the live roster, but it
still runs as the offline causal analyzer above.

# Relationship to LILITH

LILITH shares a unit slot across two providers (`qwen` DashScope path and
`lilith` fine-tuned inference service) so consensus and reporting keep working
when `LLM_PROVIDER` swaps. Per the
[clean-source rule](/_lilith_safe/constitution/clean-source-rule.md), LILITH
ignores every other unit in this registry.
